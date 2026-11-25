ALTER TABLE `Message` ADD INDEX `Message_instanceId_messageTimestamp_idx` (`instanceId`, `messageTimestamp`), ALGORITHM=INPLACE, LOCK=NONE;
