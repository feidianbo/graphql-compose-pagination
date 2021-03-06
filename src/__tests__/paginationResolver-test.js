/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver } from 'graphql-compose';
import { GraphQLInt } from 'graphql-compose/lib/graphql';
import { UserTC } from '../__mocks__/User';
import { preparePaginationResolver } from '../paginationResolver';

describe('paginationResolver', () => {
  const spyFindManyResolve = jest.spyOn(UserTC.getResolver('findMany'), 'resolve');
  const spyCountResolve = jest.spyOn(UserTC.getResolver('count'), 'resolve');
  const paginationResolver = preparePaginationResolver(UserTC, {
    countResolverName: 'count',
    findResolverName: 'findMany',
    perPage: 5,
  });

  describe('definition checks', () => {
    it('should return Resolver', () => {
      expect(paginationResolver).toBeInstanceOf(Resolver);
    });

    it('should throw error if first arg is not ObjectTypeComposer', () => {
      expect(() => {
        const args: any = [123];
        preparePaginationResolver(...args);
      }).toThrowError('should be instance of ObjectTypeComposer');
    });

    it('should throw error if opts.countResolverName are empty', () => {
      expect(() => {
        const args: any = [UserTC, {}];
        preparePaginationResolver(...args);
      }).toThrowError('should have option `opts.countResolverName`');
    });

    it('should throw error if resolver opts.countResolverName does not exists', () => {
      expect(() =>
        preparePaginationResolver(UserTC, {
          countResolverName: 'countDoesNotExists',
          findResolverName: 'findMany',
        })
      ).toThrowError("does not have resolver with name 'countDoesNotExists'");
    });

    it('should throw error if opts.findResolverName are empty', () => {
      expect(() => {
        const args: any = [UserTC, { countResolverName: 'count' }];
        preparePaginationResolver(...args);
      }).toThrowError('should have option `opts.findResolverName`');
    });

    it('should throw error if resolver opts.countResolverName does not exists', () => {
      expect(() =>
        preparePaginationResolver(UserTC, {
          countResolverName: 'count',
          findResolverName: 'findManyDoesNotExists',
        })
      ).toThrowError("does not have resolver with name 'findManyDoesNotExists'");
    });
  });

  describe('resolver basic properties', () => {
    it('should have name `pagination`', () => {
      expect(paginationResolver.name).toBe('pagination');
    });

    it('should have kind `query`', () => {
      expect(paginationResolver.kind).toBe('query');
    });

    it('should have type to be ConnectionType', () => {
      expect((paginationResolver.type: any).getTypeName()).toBe('UserPagination');
    });
  });

  describe('resolver args', () => {
    it('should have `page` arg', () => {
      expect(paginationResolver.getArgType('page')).toBe(GraphQLInt);
    });

    it('should have `perPage` arg', () => {
      expect(paginationResolver.getArgType('perPage')).toBe(GraphQLInt);
    });
  });

  describe('call of resolvers', () => {
    let spyResolveParams;
    let mockedpaginationResolver;
    let findManyResolverCalled;
    let countResolverCalled;

    beforeEach(() => {
      findManyResolverCalled = false;
      countResolverCalled = false;
      const mockedFindMany = UserTC.getResolver('findMany').wrapResolve(next => resolveParams => {
        findManyResolverCalled = true;
        spyResolveParams = resolveParams;
        return next(resolveParams);
      });
      const mockedCount = UserTC.getResolver('findMany').wrapResolve(next => resolveParams => {
        countResolverCalled = true;
        spyResolveParams = resolveParams;
        return next(resolveParams);
      });
      UserTC.setResolver('mockedFindMany', mockedFindMany);
      UserTC.setResolver('mockedCount', mockedCount);
      mockedpaginationResolver = preparePaginationResolver(UserTC, {
        countResolverName: 'mockedCount',
        findResolverName: 'mockedFindMany',
      });
    });

    it('should pass to findMany args.sort', async () => {
      await mockedpaginationResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 3,
        },
        projection: {
          items: true,
        },
      });
      expect(spyResolveParams.args.sort.name).toBe(1);
    });

    it('should pass to findMany projection from `items` on top level', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          items: {
            name: true,
            age: true,
          },
        },
      });
      expect(spyResolveParams.projection.name).toBe(true);
      expect(spyResolveParams.projection.age).toBe(true);
    });

    it('should pass to findMany custom projections to top level', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          items: true,
          score: { $meta: 'textScore' },
        },
      });
      expect(spyResolveParams.projection.score).toEqual({ $meta: 'textScore' });
    });

    it('should call count but not findMany when only count is projected', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          count: true,
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(false);
    });

    it('should call count but not findMany when only pageInfo.itemCount is projected', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          pageInfo: {
            itemCount: true,
          },
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(false);
    });

    it('should call count but not findMany when only pageInfo.pageCount is projected', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          pageInfo: {
            itemCount: true,
          },
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(false);
    });

    it('should call count and findMany resolver when count and items is projected', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          count: true,
          items: {
            name: true,
            age: true,
          },
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(true);
    });

    it('should call findMany and not count when arbitrary top level fields are projected without count', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          name: true,
          age: true,
        },
      });
      expect(countResolverCalled).toBe(false);
      expect(findManyResolverCalled).toBe(true);
    });

    it('should call findMany and count when arbitrary top level fields are projected with count', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          count: true,
          name: true,
          age: true,
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(true);
    });

    it('should call findMany but not count resolver when first arg is used', async () => {
      await mockedpaginationResolver.resolve({
        args: { first: 1 },
        projection: {
          edges: {
            node: {
              name: true,
              age: true,
            },
          },
        },
      });
      expect(countResolverCalled).toBe(false);
      expect(findManyResolverCalled).toBe(true);
    });
  });

  describe('filter tests with resolve', () => {
    it('should pass `filter` arg to `findResolverfindMany` and `count` resolvers', async () => {
      spyFindManyResolve.mockClear();
      spyCountResolve.mockClear();
      await paginationResolver.resolve({
        args: {
          filter: {
            gender: 'm',
          },
        },
        projection: {
          count: true,
          items: {
            name: true,
          },
        },
      });
      expect(spyFindManyResolve.mock.calls).toEqual([
        [
          {
            args: { filter: { gender: 'm' }, limit: 6 },
            projection: { count: true, items: { name: true }, name: true },
          },
        ],
      ]);
      expect(spyCountResolve.mock.calls).toEqual([
        [
          {
            args: { filter: { gender: 'm' } },
            projection: { count: true, items: { name: true } },
            rawQuery: undefined,
          },
        ],
      ]);
    });

    it('should add additional filtering', async () => {
      const result = await paginationResolver.resolve({
        args: {
          filter: {
            gender: 'm',
          },
          sort: { id: 1 },
        },
        projection: {
          count: true,
          items: {
            name: true,
          },
        },
      });
      expect(result.items).toHaveLength(5);
      expect(result.items[0]).toEqual({
        id: 1,
        name: 'user01',
        age: 11,
        gender: 'm',
      });
      expect(result.items[4]).toEqual({
        id: 9,
        name: 'user09',
        age: 19,
        gender: 'm',
      });
      expect(result.count).toBe(8);
    });
  });

  describe('sort tests with resolve', () => {
    it('should pass `sort` arg to `findResolverfindMany` but not to `count` resolvers', async () => {
      spyFindManyResolve.mockClear();
      spyCountResolve.mockClear();
      await paginationResolver.resolve({
        args: {
          sort: { _id: 1 },
        },
        projection: {
          count: true,
          items: {
            name: true,
          },
        },
      });
      expect(spyFindManyResolve.mock.calls).toEqual([
        [
          {
            args: { limit: 6, sort: { _id: 1 } },
            projection: { count: true, items: { name: true }, name: true },
          },
        ],
      ]);
      expect(spyCountResolve.mock.calls).toEqual([
        [
          {
            args: { filter: {} },
            projection: { count: true, items: { name: true } },
            rawQuery: undefined,
          },
        ],
      ]);
    });
  });

  describe('resolver payload', () => {
    it('should have correct pageInfo for first page', async () => {
      const result = await paginationResolver.resolve({
        args: {},
        projection: {
          pageInfo: {
            currentPage: true,
            perPage: true,
            itemCount: true,
            pageCount: true,
            hasPreviousPage: true,
            hasNextPage: true,
          },
        },
      });

      expect(result.pageInfo).toEqual({
        currentPage: 1,
        hasNextPage: true,
        hasPreviousPage: false,
        itemCount: 15,
        pageCount: 3,
        perPage: 5,
      });
    });

    it('should have correct pageInfo for last page', async () => {
      const result = await paginationResolver.resolve({
        args: { page: 3 },
        projection: {
          pageInfo: {
            currentPage: true,
            perPage: true,
            itemCount: true,
            pageCount: true,
            hasPreviousPage: true,
            hasNextPage: true,
          },
        },
      });

      expect(result.pageInfo).toEqual({
        currentPage: 3,
        hasNextPage: false,
        hasPreviousPage: true,
        itemCount: 15,
        pageCount: 3,
        perPage: 5,
      });
    });
  });
});
