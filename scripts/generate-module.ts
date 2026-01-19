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

const ModuleName = toPascalCase(moduleName); // e.g., "product" -> "Product"
const moduleNameCamel = toCamelCase(moduleName); // e.g., "product" -> "product"

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
  'domain',
  'infrastructure/repositories',
  'presentation/controllers',
  'presentation/DTOs',
];

// Define files with their content
const files: Record<string, string> = {
  // Module file
  [`${moduleName}.module.ts`]: `import { Module } from '@nestjs/common';

import { ${ModuleName}Service } from '@/modules/${moduleName}/application/services/${moduleName}.service';
import { ${ModuleName}Controller } from '@/modules/${moduleName}/presentation/controllers/${moduleName}.controller';

@Module({
  imports: [],
  controllers: [${ModuleName}Controller],
  providers: [${ModuleName}Service],
})
export class ${ModuleName}Module {}
`,

  // Domain
  [`domain/${moduleName}.domain.ts`]: `export interface ${ModuleName} {
  id: string;

  createdAt: Date;
  updatedAt: Date;
}
`,

  // Application - Service
  [`application/services/${moduleName}.service.ts`]: `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${ModuleName}Service {}
`,

  // Application - Interfaces
  [`application/interfaces/index.ts`]: `// Export interfaces here
`,

  // Infrastructure - Repository
  [`infrastructure/repositories/${moduleName}.repo.ts`]: `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${ModuleName}Repository {}
`,

  // Presentation - Controller
  [`presentation/controllers/${moduleName}.controller.ts`]: `import { Controller } from '@nestjs/common';

@Controller('${moduleName}')
export class ${ModuleName}Controller {}
`,

  // Presentation - DTOs
  [`presentation/DTOs/create-${moduleName}.dto.ts`]: `import { IsNotEmpty, IsString } from 'class-validator';

export class Create${ModuleName}Dto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
`,

  [`presentation/DTOs/update-${moduleName}.dto.ts`]: `import { IsOptional, IsString } from 'class-validator';

export class Update${ModuleName}Dto {
  @IsString()
  @IsOptional()
  name?: string;
}
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
console.log(`   2. Add your domain logic in domain/${moduleName}.domain.ts`);
console.log(
  `   3. Implement your service methods in application/services/${moduleName}.service.ts`,
);
console.log(
  `   4. Define your API endpoints in presentation/controllers/${moduleName}.controller.ts`,
);
console.log(`\n`);
