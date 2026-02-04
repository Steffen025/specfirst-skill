#!/usr/bin/env bun
/**
 * ISC Format Validation CLI
 * 
 * Command-line interface for validating tasks.md ISC format.
 * 
 * Usage:
 *   bun gates/validate-isc.ts <path-to-tasks.md>
 *   bun gates/validate-isc.ts  # validates stdin
 * 
 * @module gates/validate-isc
 */

import { readFileSync } from "fs";
import { validateISCFormat, formatValidationResult } from "./isc-format";

async function main() {
  const args = process.argv.slice(2);
  
  let content: string;
  
  if (args.length === 0) {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    content = Buffer.concat(chunks).toString("utf-8");
  } else {
    // Read from file
    const filePath = args[0];
    try {
      content = readFileSync(filePath, "utf-8");
    } catch (error) {
      console.error(`❌ Error reading file: ${filePath}`);
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
  
  // Validate
  const result = validateISCFormat(content);
  
  // Print formatted result
  console.log(formatValidationResult(result));
  
  // Exit with appropriate code
  process.exit(result.passed ? 0 : 1);
}

main();
