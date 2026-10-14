import { customType } from 'drizzle-orm/pg-core';

// В drizzle 0.45 нет встроенного bytea. pg и так отдаёт/принимает Buffer — тип нужен
// только для схемы и TS.
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});
