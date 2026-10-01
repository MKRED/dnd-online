import { IsArray } from 'class-validator';

export class ApplyOpsDto {
  // Содержимое операций проверяет parseMapOpBatch из shared — те же правила для REST и MCP.
  @IsArray({ message: 'ops должен быть списком операций' })
  ops: unknown[];
}
