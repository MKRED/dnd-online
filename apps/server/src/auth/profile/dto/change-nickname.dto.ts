import { NicknameRules } from '../../dto/nickname-rules.js';

export class ChangeNicknameDto {
  @NicknameRules()
  nickname: string;
}
