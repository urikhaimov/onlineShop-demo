import {
  EmailAuthProvider,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
} from 'firebase/auth';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import type {
  IAddProps,
  IDeleteProps,
  IDocRefProps,
  IFindByIdProps,
  IReadAllProps,
  IReadByRefProps,
  IUpdateProps,
  IWriteProps,
} from '@common/types';
import { logger } from '@common/utils';
import { auth, db } from '../firebase';

export const getRef = ({ collectionPath, document }: IDocRefProps) => {
  if (document) {
    return doc(db, collectionPath, document);
  }

  const msg = `Document must be defined. collectionPath: ${collectionPath}, document: ${document}`;
  logger.error('getRef', msg);
  throw new Error(msg);
};

export const fbSignOut = async () => {
  return signOut(auth)
    .then(() => {
      // Sign-out successful.
      return true;
    })
    .catch((error: Error) => {
      logger.error('fbSignOut', error);
      return false;
    });
};

export const fbAdd = async ({ collectionPath, data = {} }: IAddProps) => {
  return addDoc(collection(db, collectionPath), data)
    .then(async (reference) => {
      // notice && (await successSaveMsg({ instance: collectionPath }));
      return fbFindById({ collectionPath, reference });
    })
    .catch(async (error: Error) => {
      // await errorSaveMsg({ instance: collectionPath });
      logger.error(`fbAdd: ${collectionPath}`, error);
      return { error };
    });
};

export const fbWrite = async ({
  collectionPath,
  document,
  data = {},
}: IWriteProps) => {
  const docRef = getRef({ collectionPath, document });

  return setDoc(docRef, data)
    .then(async () => {
      // notice && (await successSaveMsg({ instance: collectionPath }));
      return fbFindById({ collectionPath, reference: docRef });
    })
    .catch(async (error: Error) => {
      // await errorSaveMsg({ instance: collectionPath });
      logger.error(`fbWrite: ${collectionPath}`, error);
      return { error };
    });
};

export const fbReadAll = async ({ collectionPath }: IReadAllProps) => {
  return getDocs(collection(db, collectionPath)).catch(async (error: Error) => {
    // await errorGetMsg({ instance: collectionPath });
    logger.error(`fbReadAll: ${collectionPath}`, error);
    return { error };
  });
};

export const fbReadByRef = async ({ reference }: IReadByRefProps) => {
  const snapshot = await getDoc(reference);
  return snapshot.data();
};

export const fbFindById = async (props: IFindByIdProps) => {
  const { reference, collectionPath, document } = props;

  const docRef =
    reference ?? getRef({ collectionPath, document } as IDocRefProps);
  return getDoc(docRef).catch(async (error: Error) => {
    // await errorGetMsg({ instance: collectionPath });

    console.error(error.message);
    return { error };
  });
};

export const fbUpdate = async ({
  collectionPath,
  document,
  data,
}: IUpdateProps) => {
  const docRef = getRef({ collectionPath, document });

  return updateDoc(docRef, data)
    .then(async () => {
      // notice && (await successUpdateMsg({ instance: collectionPath }));
    })
    .catch(async (error: Error) => {
      // await errorUpdateMsg({ instance: collectionPath });
      logger.error(`fbUpdate: ${collectionPath}`, error);
      return { error };
    });
};

export const fbDelete = async ({ collectionPath, document }: IDeleteProps) => {
  const docRef = getRef({ collectionPath, document });
  return deleteDoc(docRef)
    .then(() => {
      // notice && successDeleteMsg({ instance: collectionPath });
    })
    .catch(async (error: Error) => {
      // await errorDeleteMsg({ instance: collectionPath });
      logger.error(`fbDelete: ${collectionPath}`, error);
      return { error };
    });
};

export const checkCredentialWithLink = ({ email }: { email: string }) =>
  EmailAuthProvider.credentialWithLink(email, window.location.href);

export const checkSignInWithEmailLink = async ({
  email,
}: {
  email: string;
}) => {
  // Confirm the link is a sign-in with an email link.
  if (isSignInWithEmailLink(auth, window.location.href)) {
    // Additional state parameters can also be passed via URL.
    // This can be used to continue the user's intended action before triggering
    // the sign-in operation.
    // Get the email if available. This should be available if the user completes
    // the flow on the same device where they started it.

    if (!email) {
      // User opened the link on a different device. To prevent session fixation
      // attacks, ask the user to provide the associated email again.
      logger.error('checkSignInWithEmailLink: Invalid email', {
        email,
        message: 'Please provide your email for confirmation',
      });

      return false;
    }

    // The client SDK will parse the code from the link for you.
    return signInWithEmailLink(auth, email, window.location.href)
      .then((result) => {
        // You can access the new user by importing getAdditionalUserInfo
        // and calling it with a result:
        return result;
      })
      .catch(async (error: Error) => {
        // Some error occurred, you can inspect the code: error.code
        // Common errors could be invalid email and invalid or expired OTPs.
        logger.error('checkSignInWithEmailLink', error);

        return { error };
      });
  }
};
