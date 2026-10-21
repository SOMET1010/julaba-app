import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SeedDemoService } from '../src/database/seed-demo.service';

async function main() {
  process.env.SEED_DEMO = 'true';
  const app = await NestFactory.createApplicationContext(AppModule);
  const svc = app.get(SeedDemoService);
  await svc.runSeed();
  await app.close();
  console.log('DONE');
}
main().catch((e) => { console.error(e); process.exit(1); });
