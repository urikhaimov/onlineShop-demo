import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import * as mime from 'mime-types';
import { admin, adminDb } from '@common/firebase';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  // GET /users
  @Get()
  async findAll() {
    const snapshot = await adminDb.collection('users').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  // GET /users/:id
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const docRef = adminDb.collection('users').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new NotFoundException('User not found');
    return snap.data();
  }

  // PUT /users/:id
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    try {
      const docRef = adminDb.collection('users').doc(id);
      const snap = await docRef.get();
      if (!snap.exists) throw new NotFoundException('User not found');

      const updateData: Partial<UpdateUserDto> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.photoURL !== undefined) updateData.photoURL = body.photoURL;

      await docRef.update(updateData);
      return { success: true };
    } catch (error) {
      console.error('🔥 Update error:', error);
      throw new InternalServerErrorException('Failed to update user profile');
    }
  }

  // DELETE /users/:id/avatar
  @Delete(':id/avatar')
  async deleteAvatar(@Param('id') id: string) {
    const bucket = admin.storage().bucket();

    try {
      // Optionally, delete all versions of avatar by prefix:
      const [files] = await bucket.getFiles({ prefix: `avatars/${id}/` });
      await Promise.all(files.map((file) => file.delete()));

      await adminDb.collection('users').doc(id).update({ photoURL: null });
      return { success: true };
    } catch (error) {
      console.error('🔥 Error deleting avatar:', error.message);
      throw new NotFoundException('Avatar not found or already deleted');
    }
  }

  // POST /users/:id/avatar
  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ): Promise<{ photoURL: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const ext = mime.extension(file.mimetype) || 'jpg';
      const timestamp = Date.now();
      const avatarPath = `avatars/${id}/${timestamp}.${ext}`;
      const bucket = admin.storage().bucket();
      const fileRef = bucket.file(avatarPath);

      await fileRef.save(file.buffer, {
        contentType: file.mimetype,
        public: true,
        metadata: {
          cacheControl: 'public,max-age=60', // Encourage fresh fetches
        },
      });

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${avatarPath}`;

      await adminDb.collection('users').doc(id).update({
        photoURL: publicUrl,
      });

      return { photoURL: publicUrl };
    } catch (error) {
      console.error('🔥 Upload error:', error.message);
      throw new InternalServerErrorException('Failed to upload avatar');
    }
  }
}
