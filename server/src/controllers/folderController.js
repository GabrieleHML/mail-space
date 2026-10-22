const folderRepository = require('../repositories/folderRepository');
const HttpError = require('../utils/httpError');
const validate = require('../utils/validation');

// Other users' folders are reported as not found, so their ids are not disclosed
async function ownedFolderId(req) {
  const folderId = validate.id(req.params.id, 'folder id');
  if (!(await folderRepository.exists(req.user.email, folderId))) {
    throw new HttpError(404, 'Folder not found');
  }
  return folderId;
}

async function list(req, res) {
  res.json(await folderRepository.list(req.user.email));
}

async function create(req, res) {
  const name = validate.text(req.body.name, 'name', { required: true, maxLength: 255 }).trim();
  const folder = await folderRepository.create(req.user.email, name);
  if (!folder) {
    throw new HttpError(409, 'A folder with this name already exists', 'FolderExists');
  }
  res.status(201).json(folder);
}

async function remove(req, res) {
  const folderId = validate.id(req.params.id, 'folder id');
  if (!(await folderRepository.remove(req.user.email, folderId))) {
    throw new HttpError(404, 'Folder not found');
  }
  res.sendStatus(204);
}

async function listEmails(req, res) {
  const folderId = await ownedFolderId(req);
  res.json(await folderRepository.listEmails(req.user.email, folderId));
}

async function addEmails(req, res) {
  const folderId = await ownedFolderId(req);
  const emailIds = validate.idList(req.body.emailIds, 'emailIds');
  const added = await folderRepository.addEmails(req.user.email, folderId, emailIds);
  res.json({ added });
}

async function removeEmails(req, res) {
  const folderId = await ownedFolderId(req);
  const emailIds = validate.idList(req.body.emailIds, 'emailIds');
  const removed = await folderRepository.removeEmails(req.user.email, folderId, emailIds);
  res.json({ removed });
}

module.exports = { list, create, remove, listEmails, addEmails, removeEmails };
