import React, { type Consumer } from 'react';
import { createContextualCan } from '@casl/react';
import type {
  AbilityTuple,
  AnyAbility,
  MongoAbility,
  MongoQuery,
} from '@casl/ability';

export const AbilityContext = React.createContext<MongoAbility<
  AbilityTuple,
  MongoQuery
> | null>(null);

export const Can = createContextualCan(
  AbilityContext.Consumer as unknown as Consumer<AnyAbility>,
);
