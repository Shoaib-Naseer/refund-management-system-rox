import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between } from 'typeorm';
import {
  RefundCase,
  RefundCaseStatus,
  RefundStatus,
  VerificationResult,
} from '../../entities/refund-case.entity';
import { RefundAuditLog } from '../../entities/refund-audit-log.entity';
import { CreateRefundCaseDto } from './dto/create-refund-case.dto';
import { QueryRefundCasesDto } from './dto/query-refund-cases.dto';
import { VerificationService } from '../verification/verification.service';
import { RefundProcessingService } from '../refund-processing/refund-processing.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class RefundCasesService {
  private readonly logger = new Logger(RefundCasesService.name);

  constructor(
    @InjectRepository(RefundCase)
    private readonly refundCaseRepo: Repository<RefundCase>,
    private readonly verificationService: VerificationService,
    private readonly refundProcessingService: RefundProcessingService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Create a new refund case with auto-verification
   */
  async create(
    createDto: CreateRefundCaseDto,
    userContext?: any,
    bulkOperationId?: number,
  ): Promise<RefundCase> {
    this.logger.log(`Creating refund case for MSISDN: ${createDto.msisdn}`);

    // Generate case number
    const caseNumber = await this.generateCaseNumber();

    // Normalize MSISDN to 92xxx format
    const normalizedMsisdn = this.normalizeMsisdn(createDto.msisdn);

    // Create initial case
    const refundCase = this.refundCaseRepo.create({
      caseNumber,
      msisdn: normalizedMsisdn,
      amount: createDto.amount ?? null,
      paymentMethod: createDto.paymentMethod ?? null,
      accountNumber: createDto.accountNumber,
      packageCode: createDto.packageCode,
      orderId: createDto.orderId,
      transactionDatetime: createDto.transactionDatetime
        ? new Date(createDto.transactionDatetime)
        : null,
      status: RefundCaseStatus.PENDING,
      bulkOperationId: bulkOperationId || null,
      createdBy: createDto.createdBy || userContext?.username || 'system',
    });

    await this.refundCaseRepo.save(refundCase);

    // Log creation
    await this.auditLogsService.log({
      refundCaseId: refundCase.id,
      action: 'created',
      newValue: { 
        caseNumber, 
        msisdn: normalizedMsisdn, 
        amount: createDto.amount,
        bulkOperationId: bulkOperationId || null,
      },
      description: bulkOperationId 
        ? `Refund case created from bulk operation` 
        : 'Refund case created',
      performedBy: refundCase.createdBy,
      ipAddress: userContext?.ip,
      userAgent: userContext?.userAgent,
    });

    // Auto-verify
    await this.verifyCase(refundCase.id, userContext);

    // Reload with relations
    return this.findOne(refundCase.id);
  }

  /**
   * Verify a refund case
   */
  async verifyCase(id: number, userContext?: any): Promise<RefundCase> {
    const refundCase = await this.findOne(id);

    this.logger.log(`Verifying case: ${refundCase.caseNumber}`);

    // Run verification
    const verificationResult = await this.verificationService.verifyCase({
      msisdn: refundCase.msisdn,
      amount: refundCase.amount != null ? Number(refundCase.amount) : null,
      orderId: refundCase.orderId,
      transactionDatetime: refundCase.transactionDatetime,
    });

    // Update case with verification results
    refundCase.verificationResult = verificationResult.result;
    refundCase.verificationComment = verificationResult.comment;
    refundCase.eligibilityChecks = verificationResult.checks;
    refundCase.sourceTransactionId = verificationResult.sourceTransactionId;
    refundCase.sourceSnapshot = verificationResult.sourceRecord || null;
    refundCase.verifiedAt = new Date();
    refundCase.verifiedBy = userContext?.username || 'system';

    // Update status based on verification result
    if (verificationResult.result === VerificationResult.APPROVED) {
      refundCase.status = RefundCaseStatus.VERIFIED;
    } else {
      refundCase.status = RefundCaseStatus.REJECTED;
    }

    await this.refundCaseRepo.save(refundCase);

    // Log verification
    await this.auditLogsService.log({
      refundCaseId: refundCase.id,
      action: 'verified',
      newValue: {
        verificationResult: verificationResult.result,
        status: refundCase.status,
      },
      description: `Case verified: ${verificationResult.comment}`,
      performedBy: refundCase.verifiedBy,
      ipAddress: userContext?.ip,
      userAgent: userContext?.userAgent,
    });

    return refundCase;
  }

  /**
   * Process refund for a verified case
   */
  async processRefund(id: number, userContext?: any): Promise<RefundCase> {
    const refundCase = await this.findOne(id);

    // Validate case is verified and approved
    if (refundCase.verificationResult !== VerificationResult.APPROVED) {
      throw new Error('Case must be verified and approved before processing refund');
    }

    if (refundCase.refundStatus === RefundStatus.SUCCESS) {
      throw new Error('Refund already processed successfully for this case');
    }

    this.logger.log(`Processing refund for case: ${refundCase.caseNumber}`);

    // Update status to processing
    refundCase.status = RefundCaseStatus.PROCESSING;
    await this.refundCaseRepo.save(refundCase);

    try {
      // Call payment gateway
      const refundResult = await this.refundProcessingService.processRefund(
        refundCase.paymentMethod,
        {
          orderId: refundCase.orderId,
          amount: Number(refundCase.amount),
          msisdn: refundCase.msisdn,
          accountNumber: refundCase.accountNumber,
        },
      );

      // Update case with refund result
      refundCase.refundStatus = refundResult.success
        ? RefundStatus.SUCCESS
        : RefundStatus.FAILED;
      refundCase.refundDescription = refundResult.description;
      refundCase.refundRawResponse = JSON.stringify(refundResult.rawResponse);
      refundCase.refundProcessedAt = new Date();
      refundCase.refundProcessedBy = userContext?.username || 'system';
      refundCase.status = refundResult.success
        ? RefundCaseStatus.REFUNDED
        : RefundCaseStatus.FAILED;

      await this.refundCaseRepo.save(refundCase);

      // Log refund processing
      await this.auditLogsService.log({
        refundCaseId: refundCase.id,
        action: 'refunded',
        newValue: {
          refundStatus: refundCase.refundStatus,
          status: refundCase.status,
        },
        description: `Refund ${refundResult.success ? 'successful' : 'failed'}: ${refundResult.description}`,
        performedBy: refundCase.refundProcessedBy,
        ipAddress: userContext?.ip,
        userAgent: userContext?.userAgent,
      });

      return refundCase;
    } catch (error) {
      this.logger.error(`Refund processing error: ${error.message}`);

      // Update case with error
      refundCase.refundStatus = RefundStatus.FAILED;
      refundCase.refundDescription = `Error: ${error.message}`;
      refundCase.status = RefundCaseStatus.FAILED;
      await this.refundCaseRepo.save(refundCase);

      throw error;
    }
  }

  /**
   * Find all refund cases with filtering and pagination
   */
  async findAll(
    queryDto: QueryRefundCasesDto,
  ): Promise<{ data: RefundCase[]; total: number; page: number; limit: number }> {
    const page = parseInt(queryDto.page) || 1;
    const limit = parseInt(queryDto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<RefundCase> = {};

    // Apply filters
    if (queryDto.status) {
      where.status = queryDto.status;
    }
    if (queryDto.verificationResult) {
      where.verificationResult = queryDto.verificationResult;
    }
    if (queryDto.refundStatus) {
      where.refundStatus = queryDto.refundStatus;
    }
    if (queryDto.paymentMethod) {
      where.paymentMethod = queryDto.paymentMethod;
    }
    if (queryDto.search) {
      // Search in case number or MSISDN
      where.caseNumber = Like(`%${queryDto.search}%`);
    }
    if (queryDto.msisdn) {
      where.msisdn = this.normalizeMsisdn(queryDto.msisdn);
    }
    if (queryDto.startDate && queryDto.endDate) {
      where.createdAt = Between(
        new Date(queryDto.startDate),
        new Date(queryDto.endDate),
      );
    }

    const [data, total] = await this.refundCaseRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  /**
   * Find one refund case by ID
   */
  async findOne(id: number): Promise<RefundCase> {
    const refundCase = await this.refundCaseRepo.findOne({
      where: { id },
      relations: ['auditLogs', 'notifications', 'bulkOperation'],
    });

    if (!refundCase) {
      throw new NotFoundException(`Refund case with ID ${id} not found`);
    }

    return refundCase;
  }

  /**
   * Find all refund cases for a given MSISDN (normalized), newest first
   */
  async findAllByMsisdn(msisdn: string): Promise<RefundCase[]> {
    const normalizedMsisdn = this.normalizeMsisdn(msisdn);

    return this.refundCaseRepo.find({
      where: { msisdn: normalizedMsisdn },
      relations: ['auditLogs', 'notifications'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find by case number
   */
  async findByCaseNumber(caseNumber: string): Promise<RefundCase> {
    const refundCase = await this.refundCaseRepo.findOne({
      where: { caseNumber },
      relations: ['auditLogs', 'notifications', 'bulkOperation'],
    });

    if (!refundCase) {
      throw new NotFoundException(
        `Refund case with number ${caseNumber} not found`,
      );
    }

    return refundCase;
  }

  /**
   * Find all cases by bulk operation ID
   */
  async findByBulkOperationId(bulkOperationId: number): Promise<RefundCase[]> {
    return this.refundCaseRepo.find({
      where: { bulkOperationId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Generate unique case number (format: RC-YYYY-NNNNNN)
   */
  private async generateCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RC-${year}-`;

    // Find the latest case number for this year
    const lastCase = await this.refundCaseRepo
      .createQueryBuilder('rc')
      .where('rc.case_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('rc.case_number', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastCase) {
      const lastNumber = parseInt(lastCase.caseNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }

  /**
   * Normalize MSISDN to 92xxx format
   */
  private normalizeMsisdn(msisdn: string): string {
    // Remove any spaces or dashes
    msisdn = msisdn.replace(/[\s-]/g, '');

    // Convert to 92xxx format
    if (msisdn.startsWith('0')) {
      return '92' + msisdn.substring(1);
    } else if (!msisdn.startsWith('92')) {
      return '92' + msisdn;
    }

    return msisdn;
  }
}
