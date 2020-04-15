
module.exports = {
  CodapOutputFilename: (chunkData) => {
    // CODAP builds must append 'ignore' to js files
    return chunkData.chunk.name.match(/\.js$/) ? '[name].ignore': '[name]';
  }
}