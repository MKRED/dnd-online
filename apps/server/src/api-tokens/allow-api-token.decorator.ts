import { SetMetadata } from '@nestjs/common';

export const ALLOW_API_TOKEN = 'allowApiToken';

// Открывает обработчик для API-токена (SessionOrApiTokenGuard). Ставится только на
// методы, не на класс: так удаление и всё новое закрыты для токена, пока их не открыли
// явно (docs/plan/ai-access.md, «Что токену можно и чего нельзя»).
export const AllowApiToken = () => SetMetadata(ALLOW_API_TOKEN, true);
