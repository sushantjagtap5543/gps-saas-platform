exports.detectIdle = (prev, current) => {

  if (current.speed === 0 && prev.speed === 0) {
    return true;
  }

  return false;
};