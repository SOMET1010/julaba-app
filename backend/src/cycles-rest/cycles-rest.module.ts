import { Module } from '@nestjs/common';
import { CyclesRestController } from './cycles-rest.controller';

@Module({
  controllers: [CyclesRestController],
})
export class CyclesRestModule {}
