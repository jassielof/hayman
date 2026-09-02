import type { Bibliography } from './types/bibliography';
import type { AppSettings } from './types/app-settings';
import Dexie, { type Table } from 'dexie';

/**
 * HayagrivaManagerDB is a Dexie database for managing bibliographies.
 * It provides CRUD operations for bibliographies and their entries.
 */
export class HayagrivaManagerDB extends Dexie {
  bibliographies!: Table<Bibliography, string>;
  settings!: Table<AppSettings, string>;

  constructor(dbName: string = 'hayagriva-manager') {
    super(dbName);
    this.version(1).stores({
      bibliographies: 'metadata.id',
    });
    this.version(2).stores({
      bibliographies: 'metadata.id',
      settings: 'id',
    });
  }
}

export const db = new HayagrivaManagerDB();
