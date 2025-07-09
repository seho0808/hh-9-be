import { ParsePositiveIntPipe } from './parse-positive-int.pipe';
import { ValidationException } from '../exceptions';

describe('ParsePositiveIntPipe', () => {
  let pipe: ParsePositiveIntPipe;

  beforeEach(() => {
    pipe = new ParsePositiveIntPipe();
  });

  // 헬퍼 함수들
  const expectValidTransform = (input: string, expected: number) => {
    const result = pipe.transform(input);
    expect(result).toBe(expected);
  };

  const expectInvalidTransform = (input: string) => {
    expect(() => pipe.transform(input)).toThrow(ValidationException);
    expect(() => pipe.transform(input)).toThrow('Only positive integers are allowed');
  };

  const expectMaxSafeIntegerExceededError = (input: string) => {
    expect(() => pipe.transform(input)).toThrow(ValidationException);
    expect(() => pipe.transform(input)).toThrow('Number exceeds maximum safe integer');
  };

  describe('transform', () => {
    describe('기본 양의 정수', () => {
      it('"1"을 1로 변환해야 한다', () => {
        expectValidTransform('1', 1);
      });

      it('"100"을 100으로 변환해야 한다', () => {
        expectValidTransform('100', 100);
      });

      it('"999999"를 999999로 변환해야 한다', () => {
        expectValidTransform('999999', 999999);
      });
    });

    describe('특수 포맷 - 허용되는 형태', () => {
      it('앞뒤 공백이 있는 숫자를 정상 변환해야 한다', () => {
        expectValidTransform('  123  ', 123);
      });

      it('플러스 기호가 붙은 양수를 정상 변환해야 한다', () => {
        expectValidTransform('+123', 123);
      });
    });

    describe('경계값', () => {
      it('최소 양의 정수 1을 정상 변환해야 한다', () => {
        expectValidTransform('1', 1);
      });

      it('최대 안전 정수를 정상 변환해야 한다', () => {
        expectValidTransform('9007199254740991', 9007199254740991); // Number.MAX_SAFE_INTEGER
      });
    });

    describe('0과 음수', () => {
      it('0일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('0');
      });

      it('공백이 포함된 0일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('  0  ');
      });

      it('음의 정수일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('-1');
      });

      it('음의 소수일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('-1.5');
      });
    });

    describe('소수점 숫자', () => {
      it('양의 소수일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('1.5');
      });

      it('소수점이 0인 경우 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('123.0');
      });

      it('큰 소수점 숫자일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('123.456789');
      });
    });

    describe('숫자가 아닌 문자열', () => {
      it('빈 문자열일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('');
      });

      it('공백만 있는 문자열일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('   ');
      });

      it('알파벳 문자열일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('abc');
      });

      it('숫자와 문자가 혼합된 문자열일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('123abc');
      });
    });

    describe('특수 숫자 형식', () => {
      it('16진수 형태일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('0x1');
      });

      it('8진수 형태일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('0o10');
      });

      it('과학적 표기법일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('1e5');
      });
    });

    describe('특수 값', () => {
      it('Infinity일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('Infinity');
      });

      it('음의 Infinity일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('-Infinity');
      });

      it('NaN일 때 BadRequestException을 발생시켜야 한다', () => {
        expectInvalidTransform('NaN');
      });
    });

    describe('범위 초과', () => {
      it('최대 안전 정수를 초과하는 수일 때 BadRequestException을 발생시켜야 한다', () => {
        expectMaxSafeIntegerExceededError('9007199254740992'); // Number.MAX_SAFE_INTEGER + 1
      });

      it('매우 큰 수일 때 BadRequestException을 발생시켜야 한다', () => {
        expectMaxSafeIntegerExceededError('999999999999999999');
      });
    });
  });
});
