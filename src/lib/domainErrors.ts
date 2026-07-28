export class DomainNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" was not found.`);
    this.name = "DomainNotFoundError";
  }
}
