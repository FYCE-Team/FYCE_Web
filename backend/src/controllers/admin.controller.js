import * as service from "../services/admin.service.js";
const respond =
  (action, status = 200) =>
  async (req, res, next) => {
    try {
      res.status(status).json({ success: true, data: await action(req) });
    } catch (error) {
      next(error);
    }
  };
export const overview = respond(() => service.getOverview());
export const list = respond((req) =>
  service.listAdminRecords(req.params.kind, req.query),
);
export const createUser = respond(
  (req) => service.createAdminUser(req.body),
  201,
);
export const updateUser = respond((req) =>
  service.updateAdminUser(req.params.id, req.body, req.user.userId),
);
export const bookingAudit = respond((req) =>
  service.getBookingAudit(req.params.id),
);
export const reconcile = respond((req) =>
  service.reconcileAdminBooking(req.params.id),
);

import * as content from "../services/adminContent.service.js";
export const listContent = respond((req) =>
  content.contentList(req.params.type, req.query),
);
export const saveContent = respond((req) =>
  content.contentSave(
    req.params.type,
    req.params.id,
    req.body,
    req.user.userId,
  ),
);
export const deleteContent = respond((req) =>
  content.contentDelete(req.params.type, req.params.id, req.body),
);

export const cancelBooking = respond((req) =>
  service.cancelAdminBooking(req.params.id),
);

import { confirmOfflineRefund } from "../services/refund.service.js";
export const refund = respond(req => confirmOfflineRefund(req.params.id, req.body, req.user.userId));

import * as trash from "../services/adminTrash.service.js";
export const bulkPreview = respond(req => trash.previewBulk(req.body || {}, req.user.userId));
export const bulkExecute = respond(req => trash.executeBulk(req.body || {}, req.user.userId));
export const trashList = respond(req => trash.listTrash(req.params.kind, req.query));
export const reorderGallery = respond(req => content.reorderGallery(req.body || {}, req.user.userId));
export const detail = respond(req => service.getAdminDetail(req.params.kind, req.params.id));
