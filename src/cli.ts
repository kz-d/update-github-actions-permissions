import meow from "meow";
import * as fs from "node:fs/promises";
import * as globby from "globby";
import { updateGitHubActions, UpdateGitHubActionsOptions } from "./index.js";

export const cli = meow(
    `
    Usage
      $ update-github-actions-permissions "[file|glob]"
 
    Options
      --defaultPermissions                [String] "write-all" or "read-all". Default: "write-all"
      --verbose                           [Boolean] If enable verbose, output debug info.
      --use-rule-definitions              [String[]] Use rule definitions. Default: ["default", "secure-workflows"]
 
    Examples
      $ update-github-actions-permissions ".github/workflows/test.yml"
      # multiple inputs
      $ update-github-actions-permissions ".github/workflows/test.yml" ".github/workflows/publish.yml" 
      $ update-github-actions-permissions ".github/workflows/*.{yml,yaml}"
`,
    {
        importMeta: import.meta,
        flags: {
            defaultPermissions: {
                type: "string",
                default: "write-all"
            },
            verbose: {
                type: "boolean",
                default: false
            },
            useRuleDefinitions: {
                type: "string",
                isMultiple: true
            }
        },
        autoHelp: true,
        autoVersion: true
    }
);

const defaultPermissions = (permission: string): "write-all" | "read-all" => {
    if (permission === "write-all" || permission === "read-all") {
        return permission;
    }
    throw new Error(`Unknown permissions: ${permission}`);
};
export const run = async (
    input = cli.input,
    flags = cli.flags
): Promise<{
    exitStatus: number;
    stdout: string | null;
    stderr: Error | null;
}> => {
    const useRuleDefinitions = (
        flags.useRuleDefinitions && flags.useRuleDefinitions.length > 0
            ? flags.useRuleDefinitions
            : ["default", "secure-workflows"]
    ) as UpdateGitHubActionsOptions["useRuleDefinitions"];
    if (flags.verbose) {
        console.info("useRuleDefinitions: " + useRuleDefinitions.join(", "));
    }
    const expendedFilePaths = await globby.globby(input);
    for (const filePath of expendedFilePaths) {
        const yamlContent = await fs.readFile(filePath, "utf-8");
        const updatedContent = await updateGitHubActions(yamlContent, {
            filePath,
            defaultPermissions: defaultPermissions(flags.defaultPermissions),
            useRuleDefinitions,
            verbose: flags.verbose
        });
        if (yamlContent !== updatedContent) {
            await fs.writeFile(filePath, updatedContent, "utf-8");
        }
    }
    return {
        stdout: null,
        stderr: null,
        exitStatus: 0
    };
};
