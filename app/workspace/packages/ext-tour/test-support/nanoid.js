let sequence = 0;

module.exports = {
  nanoid: () => `test-id-${sequence++}`,
};
