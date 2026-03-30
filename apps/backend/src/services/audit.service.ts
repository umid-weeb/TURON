import { prisma } from '../lib/prisma.js';

export class AuditService {
  /**
   * Records a data mutation in the audit log.
   */
  static async record(params: {
    userId?: string;
    action: string;
    entity: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          oldValue: params.oldValue,
          newValue: params.newValue,
        },
      });
    } catch (error) {
      // In production, we might want to log this but not fail the main request
      console.error('❌ Audit log failure:', error);
    }
  }

  static async recordStatusChange(params: {
    userId: string;
    entity: string;
    entityId: string;
    from: string;
    to: string;
  }) {
    return this.record({
      ...params,
      action: 'STATUS_CHANGE',
      oldValue: { status: params.from },
      newValue: { status: params.to }
    });
  }
}
