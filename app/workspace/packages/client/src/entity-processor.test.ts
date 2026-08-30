import { groupScreens, P_RespScreen } from './entity-processor';

// TODO fix + add the test cases for this

describe('entity-processor', () => {
  describe('#groupScreens', () => {
    it('should group screens based on common ancestor', () => {
      // const screens = [
      //   {
      //     id: 1,
      //     parentScreenId: 2,
      //     related: [] as P_RespScreen[],
      //     updatedAt: new Date(2023, 0, 1),
      //   },
      //   {
      //     id: 2,
      //     parentScreenId: 5,
      //     related: [] as P_RespScreen[],
      //     updatedAt: new Date(2023, 0, 3),
      //   },
      //   {
      //     id: 3,
      //     parentScreenId: 4,
      //     related: [] as P_RespScreen[],
      //     updatedAt: new Date(2023, 0, 2),
      //   },
      //   {
      //     id: 10,
      //     parentScreenId: 4,
      //     related: [] as P_RespScreen[],
      //     updatedAt: new Date(2023, 0, 2),
      //   },
      //   {
      //     id: 4,
      //     parentScreenId: 5,
      //     related: [] as P_RespScreen[],
      //     updatedAt: new Date(2023, 0, 4),
      //   },
      //   {
      //     id: 5,
      //     parentScreenId: 0,
      //     related: [] as P_RespScreen[],
      //     updatedAt: new Date(2022, 11, 31),
      //   },
      //   {
      //     id: 6,
      //     parentScreenId: 0,
      //     related: [] as P_RespScreen[],
      //     updatedAt: new Date(2023, 1, 5),
      //   },
      //   {
      //     id: 7,
      //     parentScreenId: 8,
      //     related: [] as P_RespScreen[],
      //     updatedAt: new Date(2023, 1, 6),
      //   },
      //   {
      //     id: 8,
      //     parentScreenId: 0,
      //     related: [] as P_RespScreen[],
      //     updatedAt: new Date(2023, 1, 5),
      //   },
      // ] as P_RespScreen[];

      // const groupedScrn = groupScreens(screens);
      // expect(groupedScrn.length).toBe(3);
      // expect(groupedScrn[0].id).toBe(7);
      // expect(groupedScrn[0].related.length).toBe(1);
      // expect(groupedScrn[0].related[0].id).toBe(8);
      // expect(groupedScrn[1].id).toBe(6);
      // expect(groupedScrn[1].related.length).toBe(0);
      // expect(groupedScrn[2].id).toBe(4);
      // expect(groupedScrn[2].related.length).toBe(5);
    });
  });
});
