export class BibliographyNotFoundError extends Error {
  constructor(id: string) {
    super(`Bibliography not found: ${id}`);
    this.name = 'BibliographyNotFoundError';
  }
}

export class BibliographyDuplicateIdError extends Error {
  constructor(id: string) {
    super(`Bibliography with ID "${id}" already exists`);
    this.name = 'BibliographyDuplicateIdError';
  }
}

export class ReservedBibliographyIdError extends Error {
  constructor() {
    super('Bibliography ID cannot be "new" as it is reserved');
    this.name = 'ReservedBibliographyIdError';
  }
}

export class EntryAlreadyExistsError extends Error {
  constructor(entryId: string) {
    super(`Entry "${entryId}" already exists in this bibliography`);
    this.name = 'EntryAlreadyExistsError';
  }
}
