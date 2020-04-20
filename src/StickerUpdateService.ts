import * as vscode from 'vscode';
import { getCurrentTheme } from './ThemeManager';
import { performGet } from './RESTClient';
import { installSticker } from './StickerService';
import { DokiTheme } from './DokiTheme';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { VSCODE_ASSETS_URL } from './ENV';

const fetchRemoteChecksum = async (currentTheme: DokiTheme) => {
  const checksumUrl = `${VSCODE_ASSETS_URL}${stickerPathToUrl(currentTheme)}.checksum.txt`;
  console.log(`Fetching checksum: ${checksumUrl}`);
  const checkSumInputStream = await performGet(checksumUrl);
  return checkSumInputStream.setEncoding('utf8').read();
};

export const resolveLocalStickerPath = (
  currentTheme: DokiTheme,
  context: vscode.ExtensionContext,
): string => {
  const safeStickerPath = stickerPathToUrl(currentTheme);
  return path.join(context.globalStoragePath, 'stickers', safeStickerPath);
};

export function cleanPathToUrl(stickerPath: string) {
  return stickerPath.replace(/\\/g, '/');
}

export function stickerPathToUrl(currentTheme: DokiTheme) {
  const stickerPath = currentTheme.sticker.path;
  return cleanPathToUrl(stickerPath);
}

export function createChecksum(data: Buffer | string): string {
  return crypto.createHash('md5')
    .update(data)
    .digest('hex');
}

const calculateFileChecksum = (filePath: string): string => {
  const fileRead = fs.readFileSync(filePath);
  return createChecksum(fileRead);
};

const fetchLocalChecksum = async (localSticker: string) => {
  return fs.existsSync(localSticker) ?
    calculateFileChecksum(localSticker) : 'File not downloaded, bruv.';
};

export const isStickerNotCurrent = async (
  dokiTheme: DokiTheme,
  localStickerPath: string
): Promise<boolean> => {
  try {
    const remoteChecksum = await fetchRemoteChecksum(dokiTheme);
    const localChecksum = await fetchLocalChecksum(localStickerPath);
    return remoteChecksum !== localChecksum;
  } catch (e) {
    console.error('Unable to check for updates', e);
    return false;
  }
};
export enum StickerUpdateStatus {
  CURRENT, STALE, NOT_CHECKED,
}

export const attemptToUpdateSticker = async (context: vscode.ExtensionContext) => {
  const currentTheme = getCurrentTheme();
  const localStickerPath = resolveLocalStickerPath(currentTheme, context);
  if (await isStickerNotCurrent(currentTheme, localStickerPath)) {
    await installSticker(currentTheme, context, StickerUpdateStatus.STALE);
  }
};
