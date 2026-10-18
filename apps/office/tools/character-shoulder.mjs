export function shoulderY(png, frame) {
  const widths = Array.from({ length: frame.h }, (_, y) => {
    let width = 0;
    for (let x = 0; x < frame.w; x++)
      if (png.data[((frame.y + y) * png.width + frame.x + x) * 4 + 3] > 0) width++;
    return width;
  });
  // The W96 back head narrows into the neck within these rows; the first widening starts the outer shoulder.
  const neckWidth = Math.min(...widths.slice(40, 61));
  const neckY = widths.findIndex((width, y) => y >= 40 && width === neckWidth);
  return widths.findIndex((width, y) => y > neckY && width > neckWidth);
}
