-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullname" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
