import type { DocumentData, DocumentReference } from 'firebase/firestore';

type TData = Record<string, any>;
type TCollectionPath = string;
type TDocument = string;

export interface IDocRefProps {
  collectionPath: Required<TCollectionPath>;
  document: Required<TDocument>;
}

export interface IAddProps {
  collectionPath: TCollectionPath;
  data?: TData;
}

export interface IWriteProps extends IDocRefProps {
  data?: TData;
}

export interface IReadAllProps {
  collectionPath: TCollectionPath;
}

export interface IReadByRefProps {
  reference: DocumentReference<unknown, DocumentData>;
}

export interface IFindByIdProps extends Omit<IDocRefProps, 'document'> {
  document?: TDocument;
  reference?: DocumentReference<unknown, DocumentData>;
}

export interface IUpdateProps extends IDocRefProps {
  data: TData;
}

export type IDeleteProps = IDocRefProps;
