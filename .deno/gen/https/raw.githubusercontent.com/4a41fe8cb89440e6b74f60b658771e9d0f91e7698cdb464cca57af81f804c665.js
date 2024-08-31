export const simplePathMatcher = (_pattern)=>{
  const pattern = _pattern.split("/");
  const names = new Set();
  for(let i = 0; i < pattern.length; i++){
    const p = pattern[i];
    if (p[0] === "{" && p[p.length - 1] === "}") {
      const name = p.slice(1, -1).trim();
      if (!name) throw new Error("invalid param name");
      if (names.has(name)) throw new Error("duplicated param name");
      names.add(name);
    } else if (!p.trim() && i > 0 && i < pattern.length - 1) {
      throw new Error("invalid path segment");
    }
  }
  return (_path)=>{
    const path = _path.split("/");
    if (pattern.length !== path.length) return null;
    const params = {};
    for(let i = 0; i < pattern.length; i++){
      const p = pattern[i];
      if (p[0] === "{" && p[p.length - 1] === "}") {
        const name = p.slice(1, -1).trim();
        params[name] = path[i];
      } else if (p !== path[i]) return null;
    }
    return params;
  };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9OTWF0aGFyL2Rlbm8tZXhwcmVzcy9tYXN0ZXIvc3JjL3NpbXBsZVBhdGhNYXRjaGVyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UGF0aE1hdGNoZXJ9IGZyb20gXCIuLi90eXBlcy9pbmRleC50c1wiXG5cbmV4cG9ydCBjb25zdCBzaW1wbGVQYXRoTWF0Y2hlcjogUGF0aE1hdGNoZXIgPSAoX3BhdHRlcm4pID0+IHtcbiAgICBjb25zdCBwYXR0ZXJuID0gX3BhdHRlcm4uc3BsaXQoXCIvXCIpO1xuICAgIGNvbnN0IG5hbWVzID0gbmV3IFNldCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGF0dGVybi5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcCA9IHBhdHRlcm5baV07XG4gICAgICBpZiAocFswXSA9PT0gXCJ7XCIgJiYgcFtwLmxlbmd0aCAtIDFdID09PSBcIn1cIikge1xuICAgICAgICBjb25zdCBuYW1lID0gcC5zbGljZSgxLCAtMSkudHJpbSgpO1xuICAgICAgICBpZiAoIW5hbWUpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgcGFyYW0gbmFtZVwiKTtcbiAgICAgICAgaWYgKG5hbWVzLmhhcyhuYW1lKSkgdGhyb3cgbmV3IEVycm9yKFwiZHVwbGljYXRlZCBwYXJhbSBuYW1lXCIpO1xuICAgICAgICBuYW1lcy5hZGQobmFtZSk7XG4gICAgICB9IGVsc2UgaWYgKCFwLnRyaW0oKSAmJiBpID4gMCAmJiBpIDwgcGF0dGVybi5sZW5ndGggLSAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgcGF0aCBzZWdtZW50XCIpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gKF9wYXRoKSA9PiB7XG4gICAgICBjb25zdCBwYXRoID0gX3BhdGguc3BsaXQoXCIvXCIpO1xuICAgICAgaWYgKHBhdHRlcm4ubGVuZ3RoICE9PSBwYXRoLmxlbmd0aCkgcmV0dXJuIG51bGw7XG5cbiAgICAgIGNvbnN0IHBhcmFtczogYW55ID0ge307XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhdHRlcm4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgcCA9IHBhdHRlcm5baV07XG4gICAgICAgIGlmIChwWzBdID09PSBcIntcIiAmJiBwW3AubGVuZ3RoIC0gMV0gPT09IFwifVwiKSB7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IHAuc2xpY2UoMSwgLTEpLnRyaW0oKTtcbiAgICAgICAgICBwYXJhbXNbbmFtZV0gPSBwYXRoW2ldO1xuICAgICAgICB9IGVsc2UgaWYgKHAgIT09IHBhdGhbaV0pIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICB9O1xuICB9O1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sTUFBTSxvQkFBaUMsQ0FBQztFQUMzQyxNQUFNLFVBQVUsU0FBUyxLQUFLLENBQUM7RUFDL0IsTUFBTSxRQUFRLElBQUk7RUFDbEIsSUFBSyxJQUFJLElBQUksR0FBRyxJQUFJLFFBQVEsTUFBTSxFQUFFLElBQUs7SUFDdkMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxFQUFFO0lBQ3BCLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxPQUFPLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxFQUFFLEtBQUssS0FBSztNQUMzQyxNQUFNLE9BQU8sRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSTtNQUNoQyxJQUFJLENBQUMsTUFBTSxNQUFNLElBQUksTUFBTTtNQUMzQixJQUFJLE1BQU0sR0FBRyxDQUFDLE9BQU8sTUFBTSxJQUFJLE1BQU07TUFDckMsTUFBTSxHQUFHLENBQUM7SUFDWixPQUFPLElBQUksQ0FBQyxFQUFFLElBQUksTUFBTSxJQUFJLEtBQUssSUFBSSxRQUFRLE1BQU0sR0FBRyxHQUFHO01BQ3ZELE1BQU0sSUFBSSxNQUFNO0lBQ2xCO0VBQ0Y7RUFDQSxPQUFPLENBQUM7SUFDTixNQUFNLE9BQU8sTUFBTSxLQUFLLENBQUM7SUFDekIsSUFBSSxRQUFRLE1BQU0sS0FBSyxLQUFLLE1BQU0sRUFBRSxPQUFPO0lBRTNDLE1BQU0sU0FBYyxDQUFDO0lBQ3JCLElBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxRQUFRLE1BQU0sRUFBRSxJQUFLO01BQ3ZDLE1BQU0sSUFBSSxPQUFPLENBQUMsRUFBRTtNQUNwQixJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssT0FBTyxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsRUFBRSxLQUFLLEtBQUs7UUFDM0MsTUFBTSxPQUFPLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUk7UUFDaEMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRTtNQUN4QixPQUFPLElBQUksTUFBTSxJQUFJLENBQUMsRUFBRSxFQUFFLE9BQU87SUFDbkM7SUFDQSxPQUFPO0VBQ1Q7QUFDRixFQUFFIn0=