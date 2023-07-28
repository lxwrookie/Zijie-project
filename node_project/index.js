#!/usr/bin/env node

console.log("依赖图测试");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { program } = require("commander");

program
  .command("analyze")
  .option("--depth <n>", "Limit the depth of recursive analysis", parseInt)
  .option("--json [file-path]", "Save the dependency graph as JSON")
  .action(analyze);

program.parse(process.argv);
function saveAsJson(dependencyGraph, jsonFilePath) {
  fs.writeFileSync(jsonFilePath, JSON.stringify(dependencyGraph, null, 2));
  console.log(`Dependency graph saved as JSON to ${jsonFilePath}`);
}
function analyze(options) {
  const depth = options.depth !== undefined ? options.depth : Infinity;
  const jsonFilePath = options.json;

  const packageJsonPath = "./package.json";
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const dependencyGraph = getDependencyGraph(packageJson, depth);
  const analysisResult = performAnalysis(dependencyGraph);
  const jsonDataWithAnalysis = { ...dependencyGraph, analysisResult };
  console.log("*******", jsonFilePath);
  if (jsonFilePath) {
    saveAsJson(jsonDataWithAnalysis , jsonFilePath);
  } else {
    const vuePath = path.join(__dirname,'dist/dependenciey.json');
    console.log("*******", vuePath);
    saveAsJson(jsonDataWithAnalysis , vuePath);
    startServer();
  }
}
function performAnalysis(dependencyGraph) {
  const analysisResult = {
    hasCircularDependency: false,
    hasMultipleVersions: false,
    multipleVersions: {},
  };

  // ...
  const visited = new Set();
  function checkCircularDependency(node) {
    if (visited.has(node.name)) {
      analysisResult.hasCircularDependency = true;
      return;
    }
    visited.add(node.name);
    node.children.forEach(checkCircularDependency);
    visited.delete(node.name);
  }
  checkCircularDependency(dependencyGraph);
  // Check for multiple versions of the same package
  const versionsMap = new Map();
  function checkMultipleVersions(node) {
    if (
      versionsMap.has(node.name) &&
      versionsMap.get(node.name) !== node.version
    ) {
      analysisResult.hasMultipleVersions = true;
      if (!analysisResult.multipleVersions[node.name]) {
        analysisResult.multipleVersions[node.name] = [];
      }
      analysisResult.multipleVersions[node.name].push(node.version);
    }
    versionsMap.set(node.name, node.version);
    node.children.forEach(checkMultipleVersions);
  }
  checkMultipleVersions(dependencyGraph);

  return analysisResult;
}
function getDependencyGraph(packageJson, depth, parent) {
  const graph = {
    name: packageJson.name,
    version: packageJson.version,
    children: [],
  };
  const visited = new Set();
  if (visited.has(packageJson.name)) {
    // If visited, return an empty graph to break the cycle
    return graph;
  }

  visited.add(packageJson.name);

  if (depth > 0 && packageJson.dependencies) {
    for (const [depName, depVersion] of Object.entries(
      packageJson.dependencies
    )) {
      const depPackageJsonPath = path.join(
        "./node_modules",
        depName,
        "package.json"
      );
      if (fs.existsSync(depPackageJsonPath)) {
        const depPackageJson = JSON.parse(
          fs.readFileSync(depPackageJsonPath, "utf8")
        );
        const childGraph = getDependencyGraph(depPackageJson, depth - 1, graph);
        graph.children.push(childGraph);
      }
    }
  }

  return graph;
}

// 创建HTTP服务器
function startServer() {
  const app = express();
  const port = 3000;
  app.use(express.static(path.join(__dirname, "dist")));
  // 提供前端页面
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  // 提供包依赖关系数据
  // app.get('/dependencies', (req, res) => {
  //   res.sendFile(path.join(__dirname, 'dependencies.json'));
  // });
  // 启动服务器
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    import("open")
      .then((open) => {
        open(`http://localhost:${port}`);
      })
      .catch((err) => {
        console.error("Error occurred while importing open:", err);
      });
  });
}
