import React from 'react';
import { AccessDenied } from '../components/AccessDenied';
import { EAbilityActions } from '../services/ability.service';
import { Can } from '../context/AbilityContext';

type TPageProps = {
  action?: string;
  subject?: string;
  children?: React.ReactNode;
};

export const PageLayout = (props: TPageProps): React.JSX.Element => {
  const { action = EAbilityActions.READ, subject = 'page' } = props;

  return (
    <>
      <Can I={action} a={subject}>
        <div>{props.children}</div>
      </Can>
      <Can not I={action} a={subject}>
        <AccessDenied />
      </Can>
    </>
  );
};
