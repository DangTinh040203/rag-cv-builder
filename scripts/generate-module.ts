#!/usr/bin/env ts-node

/**
 * Module Generator Script
 * Generates a new Clean Architecture module with all necessary folders and files
 *
 * Usage: npx ts-node scripts/generate-module.ts <module-name>
 * Example: npx ts-node scripts/generate-module.ts product
 */

import * as fs from 'fs';
import * as path from 'path';

// Get module name from command line arguments
const moduleName = process.argv[2];

if (!moduleName) {
  console.error('❌ Error: Module name is required');
  console.log('Usage: npx ts-node scripts/generate-module.ts <module-name>');
  console.log('Example: npx ts-node scripts/generate-module.ts product');
  process.exit(1);
}

// Validate module name (lowercase, alphanumeric with hyphens)
if (!/^[a-z][a-z0-9-]*$/.test(moduleName)) {
  console.error(
    '❌ Error: Module name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens',
  );
  process.exit(1);
}

// Helper functions for naming conventions
const toPascalCase = (str: string): string => {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

const toCamelCase = (str: string): string => {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const toUpperSnakeCase = (str: string): string => {
  return str.replace(/-/g, '_').toUpperCase();
};

const ModuleName = toPascalCase(moduleName); // e.g., "product" -> "Product"
const moduleNameCamel = toCamelCase(moduleName); // e.g., "product" -> "product"
const MODULE_NAME_UPPER = toUpperSnakeCase(moduleName); // e.g., "product" -> "PRODUCT"

// Define the module structure
const modulePath = path.join(process.cwd(), 'src', 'modules', moduleName);

// Check if module already exists
if (fs.existsSync(modulePath)) {
  console.error(
    `❌ Error: Module "${moduleName}" already exists at ${modulePath}`,
  );
  process.exit(1);
}

// Define folders to create
const folders = [
  'application/interfaces',
  'application/services',
  'application/strategies',
  'domain',
  'infrastructure/repositories',
  'presentation/controllers',
  'presentation/DTOs',
];

// Define files with their content
const files: Record<string, string> = {
  // ==================== MODULE FILE ====================
  [`${moduleName}.module.ts`]: `import { Module } from '@nestjs/common';

import { ${MODULE_NAME_UPPER}_REPOSITORY_TOKEN } from '@/modules/${moduleName}/application/interfaces';
import { ${ModuleName}Service } from '@/modules/${moduleName}/application/services';
import { PrismaAdapter${ModuleName}Repository } from '@/modules/${moduleName}/infrastructure/repositories';
import { ${ModuleName}Controller } from '@/modules/${moduleName}/presentation/controllers';

@Module({
  imports: [],
  controllers: [${ModuleName}Controller],
  providers: [
    ${ModuleName}Service,

    {
      provide: ${MODULE_NAME_UPPER}_REPOSITORY_TOKEN,
      useClass: PrismaAdapter${ModuleName}Repository,
    },
  ],
})
export class ${ModuleName}Module {}
`,

  // ==================== DOMAIN ====================
  [`domain/${moduleName}.domain.ts`]: `export interface ${ModuleName} {
  id: string;

  createdAt: Date;
  updatedAt: Date;
}
`,

  [`domain/index.ts`]: `export * from '@/modules/${moduleName}/domain/${moduleName}.domain';
`,

  // ==================== APPLICATION - INTERFACES ====================
  [`application/interfaces/${moduleName}-repo.interface.ts`]: `import { type ${ModuleName} } from '@/modules/${moduleName}/domain';
import {
  type Create${ModuleName}Dto,
  type Update${ModuleName}Dto,
} from '@/modules/${moduleName}/presentation/DTOs';

export const ${MODULE_NAME_UPPER}_REPOSITORY_TOKEN = '${MODULE_NAME_UPPER}_REPOSITORY_TOKEN';

export interface I${ModuleName}Repository {
  create(payload: Create${ModuleName}Dto): Promise<${ModuleName}>;
  findById(id: string): Promise<${ModuleName} | null>;
  delete(id: string): Promise<void>;
  update(id: string, payload: Update${ModuleName}Dto): Promise<${ModuleName}>;
}
`,

  [`application/interfaces/index.ts`]: `export * from '@/modules/${moduleName}/application/interfaces/${moduleName}-repo.interface';
`,

  // ==================== APPLICATION - SERVICES ====================
  [`application/services/${moduleName}.service.ts`]: `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${ModuleName}Service {}
`,

  [`application/services/index.ts`]: `export * from '@/modules/${moduleName}/application/services/${moduleName}.service';
`,

  // ==================== APPLICATION - STRATEGIES ====================
  [`application/strategies/${moduleName}-created.strategy.ts`]: `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${ModuleName}CreatedStrategy {
  async handle(): Promise<void> {
    // TODO: Implement strategy logic
  }
}
`,

  [`application/strategies/index.ts`]: `export * from '@/modules/${moduleName}/application/strategies/${moduleName}-created.strategy';
`,

  // ==================== INFRASTRUCTURE - REPOSITORY ====================
  [`infrastructure/repositories/prisma-${moduleName}.repo.ts`]: `import { type PrismaService } from '@/libs/databases/prisma.service';
import { type I${ModuleName}Repository } from '@/modules/${moduleName}/application/interfaces';
import { type ${ModuleName} } from '@/modules/${moduleName}/domain';
import {
  type Create${ModuleName}Dto,
  type Update${ModuleName}Dto,
} from '@/modules/${moduleName}/presentation/DTOs';

export class PrismaAdapter${ModuleName}Repository implements I${ModuleName}Repository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: Create${ModuleName}Dto): Promise<${ModuleName}> {
    return this.prisma.${moduleNameCamel}.create({ data: payload });
  }

  async findById(id: string): Promise<${ModuleName} | null> {
    return this.prisma.${moduleNameCamel}.findUnique({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.${moduleNameCamel}.delete({ where: { id } });
  }

  async update(id: string, payload: Update${ModuleName}Dto): Promise<${ModuleName}> {
    return this.prisma.${moduleNameCamel}.update({ where: { id }, data: payload });
  }
}
`,

  [`infrastructure/repositories/index.ts`]: `export * from '@/modules/${moduleName}/infrastructure/repositories/prisma-${moduleName}.repo';
`,

  // ==================== PRESENTATION - CONTROLLER ====================
  [`presentation/controllers/${moduleName}.controller.ts`]: `import { Controller } from '@nestjs/common';

@Controller('${moduleName}')
export class ${ModuleName}Controller {}
`,

  [`presentation/controllers/index.ts`]: `export * from '@/modules/${moduleName}/presentation/controllers/${moduleName}.controller';
`,

  // ==================== PRESENTATION - DTOs ====================
  [`presentation/DTOs/create-${moduleName}.dto.ts`]: `import { IsNotEmpty, IsString } from 'class-validator';

export class Create${ModuleName}Dto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
`,

  [`presentation/DTOs/get-${moduleName}.dto.ts`]: `import { IsNotEmpty, IsString } from 'class-validator';

export class Get${ModuleName}Dto {
  @IsString()
  @IsNotEmpty()
  id: string;
}
`,

  [`presentation/DTOs/update-${moduleName}.dto.ts`]: `import { IsOptional, IsString } from 'class-validator';

export class Update${ModuleName}Dto {
  @IsString()
  @IsOptional()
  name?: string;
}
`,

  [`presentation/DTOs/index.ts`]: `export * from '@/modules/${moduleName}/presentation/DTOs/create-${moduleName}.dto';
export * from '@/modules/${moduleName}/presentation/DTOs/get-${moduleName}.dto';
export * from '@/modules/${moduleName}/presentation/DTOs/update-${moduleName}.dto';
`,
};

// Create folders
console.log(`\n🚀 Creating module "${moduleName}"...\n`);

folders.forEach((folder) => {
  const folderPath = path.join(modulePath, folder);
  fs.mkdirSync(folderPath, { recursive: true });
  console.log(`📁 Created folder: ${folder}`);
});

// Create files
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(modulePath, filePath);
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`📄 Created file: ${filePath}`);
});

console.log(`\n✅ Module "${moduleName}" created successfully!`);
console.log(`📍 Location: ${modulePath}`);

console.log(`\n📋 Next steps:`);
console.log(`   1. Import ${ModuleName}Module in your app.module.ts`);
console.log(
  `   2. Add your domain properties in domain/${moduleName}.domain.ts`,
);
console.log(
  `   3. Create Prisma model for ${moduleNameCamel} in schema.prisma`,
);
console.log(
  `   4. Implement your service methods in application/services/${moduleName}.service.ts`,
);
console.log(
  `   5. Define your API endpoints in presentation/controllers/${moduleName}.controller.ts`,
);
console.log(`\n`);
