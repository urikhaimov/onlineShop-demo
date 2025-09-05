// apps/api/src/database/database.module.ts
import { Module } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';

@Module({
  providers: [
    {
      provide: Firestore,
      useFactory: () => {
        const projectId = process.env.FB_ADMIN_PROJECT_ID;
        const clientEmail = process.env.FB_ADMIN_CLIENT_EMAIL;
        // IMPORTANT: restore newlines that are escaped in .env
        const privateKey = (process.env.FB_ADMIN_PRIVATE_KEY || '')
          .replace(/\\n/g, '\n')
          .replace(/^"|"$/g, ''); // strip accidental wrapping quotes

        if (!projectId || !clientEmail || !privateKey) {
          throw new Error('Missing FB_ADMIN_* envs for Firestore credentials');
        }

        const db = new Firestore({
          projectId,
          credentials: {
            client_email: clientEmail,
            private_key: privateKey,
          },
        });
        db.settings({ ignoreUndefinedProperties: true });
        return db;
      },
    },
  ],
  exports: [Firestore],
})
export class DatabaseModule {}
