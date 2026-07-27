import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT, 10),
  pktTimezone: process.env.PKT_TIMEZONE,
  notificationsServiceUrl: process.env.NOTIFICATIONS_SERVICE_URL,
}));
