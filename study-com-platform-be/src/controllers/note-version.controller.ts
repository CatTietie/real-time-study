import { Request, Response } from "express";
import NoteVersion from "../models/note-version.model";
import CollaborativeNote from "../models/collaborative-note.model";
import User from "../models/user.model";
import * as Y from "yjs";
import { getLiveDoc, getDocClients, forceCreateVersion } from "../services/collaborative-note-yjs.service";

export const listVersions = async (req: Request, res: Response) => {
  try {
    const noteId = Number(req.params.noteId);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const { rows, count } = await NoteVersion.findAndCountAll({
      where: { note_id: noteId },
      attributes: ["id", "note_id", "version_number", "creator_id", "created_at"],
      include: [{ model: User, attributes: ["id", "username", "nickname", "avatar"] }],
      order: [["version_number", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    res.json({
      success: true,
      message: "获取版本列表成功",
      data: rows,
      pagination: { page, pageSize, total: count },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取版本列表失败";
    res.status(500).json({ success: false, message });
  }
};

export const getVersion = async (req: Request, res: Response) => {
  try {
    const versionId = Number(req.params.versionId);

    const version = await NoteVersion.findByPk(versionId, {
      attributes: ["id", "note_id", "version_number", "content_html", "creator_id", "created_at"],
      include: [{ model: User, attributes: ["id", "username", "nickname", "avatar"] }],
    });

    if (!version) {
      return res.status(404).json({ success: false, message: "版本不存在" });
    }

    res.json({ success: true, message: "获取版本详情成功", data: version });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取版本详情失败";
    res.status(500).json({ success: false, message });
  }
};

export const restoreVersion = async (req: Request, res: Response) => {
  try {
    const noteId = Number(req.params.noteId);
    const versionId = Number(req.params.versionId);
    const userId = (req as any).user?.id;

    const version = await NoteVersion.findByPk(versionId);
    if (!version || version.note_id !== noteId) {
      return res.status(404).json({ success: false, message: "版本不存在" });
    }

    if (!version.content_yjs) {
      return res.status(400).json({ success: false, message: "该版本无法恢复（缺少Yjs数据）" });
    }

    const docName = `note_${noteId}`;
    const liveDoc = getLiveDoc(docName);

    if (liveDoc) {
      // Apply restored state to live doc — connected clients will receive the update
      const restoredDoc = new Y.Doc();
      Y.applyUpdate(restoredDoc, new Uint8Array(version.content_yjs));

      const fragment = liveDoc.getXmlFragment("default");
      liveDoc.transact(() => {
        fragment.delete(0, fragment.length);
        const restoredFragment = restoredDoc.getXmlFragment("default");
        const content = restoredFragment.toArray();
        for (const item of content) {
          if (item instanceof Y.XmlElement) {
            const cloned = new Y.XmlElement(item.nodeName || "div");
            for (const [key, val] of Object.entries(item.getAttributes())) {
              cloned.setAttribute(key, val as string);
            }
            cloned.insert(0, cloneXmlContent(item));
            fragment.push([cloned]);
          } else if (item instanceof Y.XmlText) {
            const text = new Y.XmlText();
            text.insert(0, item.toJSON());
            fragment.push([text]);
          }
        }
      });

      restoredDoc.destroy();
    } else {
      // No live doc — directly update DB
      await CollaborativeNote.update(
        {
          content_yjs: version.content_yjs,
          content_html: version.content_html,
        },
        { where: { id: noteId } }
      );
    }

    // Force create a new version for the restore action
    await forceCreateVersion(noteId, userId);

    res.json({ success: true, message: `已恢复到版本 ${version.version_number}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "恢复版本失败";
    res.status(500).json({ success: false, message });
  }
};

export const createManualVersion = async (req: Request, res: Response) => {
  try {
    const noteId = Number(req.params.noteId);
    const userId = (req as any).user?.id;

    await forceCreateVersion(noteId, userId);

    res.json({ success: true, message: "手动保存版本成功" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存版本失败";
    res.status(500).json({ success: false, message });
  }
};

function cloneXmlContent(element: Y.XmlElement): (Y.XmlElement | Y.XmlText)[] {
  const result: (Y.XmlElement | Y.XmlText)[] = [];
  for (const child of element.toArray()) {
    if (child instanceof Y.XmlElement) {
      const cloned = new Y.XmlElement(child.nodeName || "div");
      for (const [key, val] of Object.entries(child.getAttributes())) {
        cloned.setAttribute(key, val as string);
      }
      cloned.insert(0, cloneXmlContent(child));
      result.push(cloned);
    } else if (child instanceof Y.XmlText) {
      const text = new Y.XmlText();
      text.insert(0, child.toJSON());
      result.push(text);
    }
  }
  return result;
}
