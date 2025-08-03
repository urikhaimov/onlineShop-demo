import React from 'react';
import { AccessDenied } from '../components/AccessDenied';
import { EAbilityActions } from '../services/ability.service';
import { useAuth } from '../hooks/useAuth';
type TPageProps = {
  action?: string;
  subject?: string;
  children?: React.ReactNode;
};

export const PageLayout = (props: TPageProps): React.JSX.Element => {
  const { action = EAbilityActions.READ, subject = 'page' } = props;
  const { ability } = useAuth();
  return (
    <>
      {ability.can(action, subject) ? (
        <div>{props.children}</div>
      ) : (
        <AccessDenied />
      )}
    </>
  );
};
