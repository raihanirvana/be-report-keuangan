import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    if (!process.env.MONGODB_URI) {
      return {
        module: DatabaseModule,
      };
    }

    return {
      imports: [
        MongooseModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            uri: configService.get<string>('env.database.mongodbUri'),
          }),
        }),
      ],
      module: DatabaseModule,
    };
  }
}
