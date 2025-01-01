#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import { execSync } from 'child_process';

const program = new Command();

program
  .name('create-mderic-boilerplates')
  .description('Scaffold a mderic boilerplate into your current folder')
  .argument('<boilerplate-name>', 'Name of the boilerplate to use (e.g., express-api)')
  .action(async (name) => {
    const TEMP_DIR = path.join(process.cwd(), '__mderic-boilerplates-tmp__');
    const BACKEND_DIR = path.join(process.cwd(), 'backend');
    const REPO_URL = 'https://github.com/muhammadderic/mderic-boilerplates.git';

    // Cleanup function that retries on EBUSY errors
    const cleanup = async (dir) => {
      const maxRetries = 5;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          if (fs.existsSync(dir)) {
            await fse.remove(dir);
          }
          return;
        } catch (err) {
          if (err.code === 'EBUSY') {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 200 * retryCount));
          } else {
            throw err;
          }
        }
      }
      throw new Error(`Failed to remove directory after ${maxRetries} attempts: ${dir}`);
    };

    try {
      // 1. Clone the repo into temp folder
      console.log(`🔄 Cloning boilerplates...`);
      execSync(`git clone --depth=1 ${REPO_URL} "${TEMP_DIR}"`, { stdio: 'inherit' });

      const boilerplatePath = path.join(TEMP_DIR, name);
      if (!fs.existsSync(boilerplatePath)) {
        console.error(`❌ Boilerplate "${name}" not found. Available boilerplates:`);

        // List available boilerplates
        const boilerplatesDir = path.join(TEMP_DIR);
        if (fs.existsSync(boilerplatesDir)) {
          const available = fs.readdirSync(boilerplatesDir);
          console.log(available.map(b => `- ${b}`).join('\n'));
        }

        await cleanup(TEMP_DIR);
        process.exit(1);
      }

      // 2. Create backend folder if it doesn't exist
      if (!fs.existsSync(BACKEND_DIR)) {
        fs.mkdirSync(BACKEND_DIR);
      }

      // 3. Copy contents of the boilerplate to the backend folder
      console.log(`📁 Copying boilerplate "${name}" to backend folder...`);
      await fse.copy(boilerplatePath, BACKEND_DIR, {
        overwrite: true,
        errorOnExist: false,
      });

      // 4. Clean up temp folder
      await cleanup(TEMP_DIR);

      console.log(`✅ Boilerplate "${name}" is ready!`);
      console.log(`👉 Next steps:`);
      console.log(`   cd backend`);
      console.log(`   npm install`);
    } catch (err) {
      console.error('❌ Failed to scaffold:', err);
      try {
        await cleanup(TEMP_DIR);
      } catch (cleanupErr) {
        console.error('❌ Failed to clean up temporary directory:', cleanupErr);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
