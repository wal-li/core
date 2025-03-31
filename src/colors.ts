import { ColorCodes } from './constants';
import { ColorCode } from './enums';

class BaseColors {
  style(colors: ColorCode[], args: any[]) {
    let msg = args.join('');
    for (const colorCode of colors) {
      // @ts-ignore
      msg = ColorCodes[colorCode] ? `\x1b[${ColorCodes[colorCode][0]}m${msg}\x1b[${ColorCodes[colorCode][1]}m` : msg;
    }
    return msg;
  }
}

export type Colors = BaseColors & Record<ColorCode, (...args: any) => string>;
export const Colors = class Colors extends BaseColors {} as new (
  ...args: ConstructorParameters<typeof BaseColors>
) => Colors;

Object.values(ColorCode).forEach(
  (colorCode) =>
    (Colors.prototype[colorCode] = function (...args: any[]) {
      return this.style([colorCode], args);
    }),
);

export const colors = new Colors();
