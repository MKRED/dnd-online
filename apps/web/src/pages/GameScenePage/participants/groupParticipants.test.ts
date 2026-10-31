import { describe, expect, it } from 'vitest';
import type { Participant } from './ParticipantRow';
import { participantGroups, revealKeys } from './groupParticipants';

const p = (key: string, patch: Partial<Participant> = {}): Participant => ({
  key,
  image: null,
  kind: 'monster',
  name: key,
  hitPoints: { current: 5, max: 10 },
  health: null,
  feetLeft: 30,
  hidden: false,
  selectable: true,
  group: 'monster',
  kin: null,
  ...patch,
});

describe('participantGroups', () => {
  it('порядок групп, пустые не показываются, счёт раненых и поверженных', () => {
    const groups = participantGroups([
      p('1', { health: 'bloodied' }),
      p('2', { health: 'down' }),
      p('h', { kind: 'pc', group: 'pc' }),
      p('u', { group: 'unique' }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['pc', 'unique', 'monster']);
    expect(groups[2]).toMatchObject({ count: 2, hurt: 1, down: 1 });
  });

  it('одинаковые — одной строкой на месте первого, одиночка — строкой', () => {
    const [group] = participantGroups([
      p('1', { kin: 'monster:rat' }),
      p('2', { kin: 'monster:orc' }),
      p('3', { kin: 'monster:rat' }),
    ]);
    expect(group.entries).toMatchObject([
      {
        kind: 'kin',
        key: 'monster:rat',
        participants: [{ key: '1' }, { key: '3' }],
      },
      { kind: 'row', participant: { key: '2' } },
    ]);
  });

  it('что раскрыть для выбранного', () => {
    const groups = participantGroups([
      p('1', { kin: 'monster:rat' }),
      p('3', { kin: 'monster:rat' }),
      p('h', { kind: 'pc', group: 'pc' }),
    ]);
    expect(revealKeys(groups, 'creature:3')).toEqual([
      'monster',
      'monster:rat',
    ]);
    expect(revealKeys(groups, 'pc:h')).toEqual(['pc']);
    expect(revealKeys(groups, 'creature:404')).toEqual([]);
  });
});
