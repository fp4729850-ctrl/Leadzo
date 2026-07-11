export type Id<TableName extends string> = string;
export type Doc<TableName extends string> = any;
export type Record<K extends keyof any, T> = {
  [P in K]: T;
};
