// apps/api/src/database/database.module.ts
import { Module } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';

function parsePrivateKey(raw: string | undefined): string {
  if (!raw) return '';
  let key = raw.replace(/^["']|["']$/g, '');
  if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');
  return key;
}

function resolveFirestoreCredentials(): {
  projectId: string;
  client_email: string;
  private_key: string;
} {
  const jsonBlob = process.env.FB_ADMIN_SERVICE_ACCOUNT_JSON;
  if (jsonBlob) {
    const sa = JSON.parse(jsonBlob);
    return {
      projectId: sa.project_id,
      client_email: sa.client_email,
      private_key: sa.private_key,
    };
  }

  const projectId = process.env.FB_ADMIN_PROJECT_ID;
  const client_email = process.env.FB_ADMIN_CLIENT_EMAIL;
  const private_key = parsePrivateKey(process.env.FB_ADMIN_PRIVATE_KEY);

  if (!projectId || !client_email || !private_key) {
    throw new Error(
      'Missing Firebase credentials. Set FB_ADMIN_SERVICE_ACCOUNT_JSON (full service-account JSON) ' +
        'or FB_ADMIN_PROJECT_ID + FB_ADMIN_CLIENT_EMAIL + FB_ADMIN_PRIVATE_KEY.',
    );
  }

  return { projectId, client_email, private_key };
}

@Module({
  providers: [
    {
      provide: Firestore,
      useFactory: () => {
        const { projectId, client_email, private_key } =
          resolveFirestoreCredentials();
        const db = new Firestore({
          projectId,
          credentials: { client_email, private_key },
        });
        db.settings({ ignoreUndefinedProperties: true });
        return db;
      },
    },
  ],
  exports: [Firestore],
})
export class DatabaseModule {}
