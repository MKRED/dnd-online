import { Badge } from '@mantine/core';
import { Fragment } from 'react';
import { DAMAGE_TYPE_LABELS, damageTotal, type DamageDealtPart } from 'shared';
import classes from './Journal.module.css';
import { DAMAGE_TYPE_COLORS } from './damageTypeColors';

// Урон по частям: «6 Колющий + 4 Некротический = 10». Часть без типа — только число;
// сумма — когда частей больше одной.
function DamagePartsText({ parts }: { parts: DamageDealtPart[] }) {
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && ' + '}
          <span className={classes.amount}>{part.amount}</span>
          {part.type && (
            <>
              {' '}
              <Badge
                component="span"
                size="xs"
                variant="light"
                color={DAMAGE_TYPE_COLORS[part.type]}
                className={classes.damageType}
              >
                {DAMAGE_TYPE_LABELS[part.type]}
              </Badge>
            </>
          )}
        </Fragment>
      ))}
      {parts.length > 1 && (
        <>
          {' = '}
          <span className={classes.amount}>{damageTotal(parts)}</span>
        </>
      )}
    </>
  );
}

export default DamagePartsText;
