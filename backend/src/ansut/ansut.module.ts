import { Module } from "@nestjs/common";
import { AnsutService } from "./ansut.service";

@Module({
  providers: [AnsutService],
  exports: [AnsutService],
})
export class AnsutModule {}
