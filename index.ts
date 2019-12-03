import {
  FlatList,
  ViewStyle,
  ViewToken,
  StyleProp,
  ListRenderItem,
  VirtualizedListProperties,
  RefreshControl,
} from 'react-native';
import {Component, createElement, RefObject} from 'react';
const pull = require('pull-stream');

export type Callback<T> = (endOrErr: boolean | any, data?: T) => void;
export type Readable<T> = (endOrErr: boolean | any, cb?: Callback<T>) => void;
export type GetReadable<T> = (opts?: any) => Readable<T>;

export interface PullFlatListProps<ItemT>
  extends VirtualizedListProperties<ItemT> {
  /**
   * Factory function which returns a pull stream to be used when scrolling
   * the FlatList, to pull more items and append them to the list.
   */
  getScrollStream: GetReadable<ItemT> | null;

  /**
   * Factory function which returns a pull stream to be used to prepend items
   * to the FlatList, regardless of scrolling.
   */
  getPrefixStream?: GetReadable<ItemT> | null;

  /**
   * How many items to pull from the pull stream when the scroll position
   * reaches the end.
   */
  pullAmount?: number;

  /**
   * Whether or not this list can be refreshed with the pull-to-refresh gesture.
   * By default, this is false.
   */
  refreshable?: boolean;

  /**
   * Rendered in between each item, but not at the top or bottom
   */
  ItemSeparatorComponent?:
    | React.ComponentType<any>
    | (() => React.ReactElement<any>)
    | null;

  /**
   * Rendered when the list is empty.
   */
  ListEmptyComponent?:
    | React.ComponentClass<any>
    | React.ReactElement<any>
    | (() => React.ReactElement<any>)
    | null;

  /**
   * Rendered at the very end of the list.
   */
  ListFooterComponent?:
    | React.ComponentClass<any>
    | React.ReactElement<any>
    | (() => React.ReactElement<any>)
    | null;

  /**
   * Rendered at the very beginning of the list.
   */
  ListHeaderComponent?:
    | React.ComponentClass<any>
    | React.ReactElement<any>
    | (() => React.ReactElement<any>)
    | null;

  /**
   * The colors (at least one) that will be used to draw the refresh indicator.
   */
  refreshColors?: Array<string>;

  /**
   * Optional custom style for multi-item rows generated when numColumns > 1
   */
  columnWrapperStyle?: StyleProp<ViewStyle>;

  /**
   * When false tapping outside of the focused text input when the keyboard
   * is up dismisses the keyboard. When true the scroll view will not catch
   * taps and the keyboard will not dismiss automatically. The default value
   * is false.
   */
  keyboardShouldPersistTaps?: boolean | 'always' | 'never' | 'handled';

  /**
   * `getItemLayout` is an optional optimization that lets us skip measurement of dynamic
   * content if you know the height of items a priori. getItemLayout is the most efficient,
   * and is easy to use if you have fixed height items, for example:
   * ```
   * getItemLayout={(data, index) => (
   *   {length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index}
   * )}
   * ```
   * Remember to include separator length (height or width) in your offset calculation if you specify
   * `ItemSeparatorComponent`.
   */
  getItemLayout?: (
    data: Array<ItemT> | null,
    index: number,
  ) => {length: number; offset: number; index: number};

  /**
   * If true, renders items next to each other horizontally instead of stacked vertically.
   */
  horizontal?: boolean;

  /**
   * How many items to render in the initial batch
   */
  initialNumToRender?: number;

  /**
   * Instead of starting at the top with the first item, start at initialScrollIndex
   */
  initialScrollIndex?: number;

  /**
   * Used to extract a unique key for a given item at the specified index. Key is used for caching
   * and as the react key to track item re-ordering. The default extractor checks `item.key`, then
   * falls back to using the index, like React does.
   */
  keyExtractor?: (item: ItemT, index: number) => string;

  legacyImplementation?: boolean;

  /**
   * Multiple columns can only be rendered with `horizontal={false}` and will zig-zag like a `flexWrap` layout.
   * Items should all be the same height - masonry layouts are not supported.
   */
  numColumns?: number;

  /**
   * Called once when the scroll position gets within onEndReachedThreshold of the rendered content.
   */
  onEndReached?: ((info: {distanceFromEnd: number}) => void) | null;

  /**
   * How far from the end (in units of visible length of the list) the bottom edge of the
   * list must be from the end of the content to trigger the `onEndReached` callback.
   * Thus a value of 0.5 will trigger `onEndReached` when the end of the content is
   * within half the visible length of the list.
   */
  onEndReachedThreshold?: number | null;

  /**
   * Called once when the PullFlatList has completed its first burst of pulls
   * of data. Emits the number of items in the data array.
   */
  onInitialPullDone?: (amountItems: number) => void;

  /**
   * Called when the viewability of rows changes, as defined by the `viewablePercentThreshold` prop.
   */
  onViewableItemsChanged?:
    | ((info: {
        viewableItems: Array<ViewToken>;
        changed: Array<ViewToken>;
      }) => void)
    | null;

  /**
   * Takes an item from data and renders it into the list. Typical usage:
   * ```
   * _renderItem = ({item}) => (
   *   <TouchableOpacity onPress={() => this._onPress(item)}>
   *     <Text>{item.title}}</Text>
   *   <TouchableOpacity/>
   * );
   * ...
   * <FlatList data={[{title: 'Title Text', key: 'item1'}]} renderItem={this._renderItem} />
   * ```
   * Provides additional metadata like `index` if you need it.
   */
  renderItem: ListRenderItem<ItemT>;

  /**
   * See `ViewabilityHelper` for flow type and further documentation.
   */
  viewabilityConfig?: any;

  /**
   * Note: may have bugs (missing content) in some circumstances - use at your own risk.
   *
   * This may improve scroll performance for large lists.
   */
  removeClippedSubviews?: boolean;
}

export type State<T> = {
  data: Array<T>;
  isExpectingMore: boolean;
  updateInt: number;
  refreshing: boolean;
};

const DEFAULT_INITIAL_PULL_AMOUNT = 4;
const DEFAULT_PULL_AMOUNT = 30;
const DEFAULT_END_THRESHOLD = 4;

export class PullFlatList<T> extends Component<PullFlatListProps<T>, State<T>> {
  constructor(props: PullFlatListProps<T>) {
    super(props);
    this.state = {
      data: [],
      isExpectingMore: true,
      updateInt: 0,
      refreshing: false,
    };
    this.isPulling = false;
    this.morePullQueue = 0;
    this.iteration = 0;
    this.initialDone = false;
    this._onEndReached = this.onEndReached.bind(this);
    this._onRefresh = props.refreshable ? this.onRefresh.bind(this) : undefined;
    this.flatListRef = undefined;
  }

  private scrollReadable?: Readable<T>;
  private prefixReadable?: Readable<T>;
  private isPulling: boolean;
  private morePullQueue: number;
  private iteration: number;
  private initialDone: boolean;
  private flatListRef?: RefObject<FlatList<T>>;
  private _onEndReached: (info: {distanceFromEnd: number}) => void;
  private _onRefresh?: () => void;

  public componentDidMount() {
    if (this.props.getScrollStream) {
      this.startScrollListener(this.props.getScrollStream());
    }
    if (this.props.getPrefixStream) {
      this.startPrefixListener(this.props.getPrefixStream());
    }
  }

  public componentWillUnmount() {
    this.stopScrollListener();
    this.stopPrefixListener();
  }

  public componentWillReceiveProps(nextProps: PullFlatListProps<T>) {
    const nextReadable = nextProps.getScrollStream;
    if (nextReadable && nextReadable !== this.props.getScrollStream) {
      this.startScrollListener(nextReadable());
    }
  }

  public startScrollListener(readable?: Readable<T> | null) {
    if (readable) {
      this.scrollReadable = readable;
    }
    if (this.state.isExpectingMore) {
      this._pullWhenScrolling(
        this.props.initialNumToRender ?? DEFAULT_INITIAL_PULL_AMOUNT,
      );
    }
  }

  public startPrefixListener(readable?: Readable<T> | null) {
    if (!readable) {
      return;
    }
    this.prefixReadable = readable;
    const that = this;
    readable(null, function read(end, item) {
      if (end) {
        return;
      } else if (item) {
        that.setState((prev: State<T>) => ({
          data: [item].concat(prev.data),
          isExpectingMore: prev.isExpectingMore,
          updateInt: 1 - prev.updateInt,
          refreshing: prev.refreshing,
        }));
        readable(null, read);
      }
    });
  }

  public stopScrollListener() {
    if (this.scrollReadable) {
      this.scrollReadable(true, () => {});
    }
    this.setState((prev: State<T>) => ({
      data: [],
      isExpectingMore: true,
      updateInt: 1 - prev.updateInt,
      refreshing: prev.refreshing,
    }));
  }

  public stopPrefixListener() {
    if (this.prefixReadable) {
      this.prefixReadable(true, () => {});
    }
  }

  private onEndReached(info: {distanceFromEnd: number}): void {
    if (this.state.isExpectingMore) {
      this._pullWhenScrolling(this.props.pullAmount ?? DEFAULT_PULL_AMOUNT);
    }
  }

  private onRefresh(): void {
    if (this.scrollReadable) {
      this.scrollReadable(true, () => {});
    }
    this.setState((prev: State<T>) => ({
      data: [],
      isExpectingMore: true,
      updateInt: 1 - prev.updateInt,
      refreshing: true,
    }));
    this.iteration += 1;
    this.isPulling = false;
    this.morePullQueue = 0;
    if (this.props.getScrollStream) {
      this.scrollReadable = this.props.getScrollStream();
      this._pullWhenScrolling(
        this.props.initialNumToRender ?? DEFAULT_INITIAL_PULL_AMOUNT,
      );
    }
    if (this.props.onRefresh) {
      this.props.onRefresh();
    }
  }

  private _pullWhenScrolling(amount: number): void {
    const readable = this.scrollReadable;
    if (!readable) return;
    if (this.isPulling) {
      this.morePullQueue = amount;
      return;
    }
    this.isPulling = true;
    const key: (item: T, idx?: number) => any = this.props.keyExtractor as any;
    const myIteration = this.iteration;
    const that = this;
    const buffer: Array<T> = [];
    readable(null, function read(end, item) {
      if (that.iteration !== myIteration) return;
      if (end === true) {
        that._onEndPullingScroll(buffer, false);
      } else if (item) {
        const idxStored = that.state.data.findIndex(x => key(x) === key(item));
        const idxInBuffer = buffer.findIndex(x => key(x) === key(item));

        // Consume message
        if (idxStored >= 0) {
          const newData = that.state.data;
          newData[idxStored] = item;
          that.setState((prev: State<T>) => ({
            data: newData,
            isExpectingMore: prev.isExpectingMore,
            updateInt: 1 - prev.updateInt,
            refreshing: prev.refreshing,
          }));
        } else if (idxInBuffer >= 0) {
          buffer[idxInBuffer] = item;
        } else {
          buffer.push(item);
        }

        // Continue
        if (buffer.length >= amount) {
          that._onEndPullingScroll(buffer, that.state.isExpectingMore);
        } else if (that.state.isExpectingMore) {
          readable(null, read);
        }
      }
    });
  }

  private _onEndPullingScroll(buffer: Array<T>, isExpectingMore: boolean) {
    this.isPulling = false;
    if (!this.initialDone && this.props.onInitialPullDone) {
      this.initialDone = true;
      this.props.onInitialPullDone(this.state.data.length + buffer.length);
    }
    this.setState((prev: State<T>) => ({
      data: prev.data.concat(buffer),
      isExpectingMore,
      updateInt: 1 - prev.updateInt,
      refreshing: false,
    }));
    const remaining = this.morePullQueue;
    if (remaining > 0) {
      this.morePullQueue = 0;
      this._pullWhenScrolling(remaining);
    }
  }

  public scrollToOffset(opts: any) {
    if (this.flatListRef) {
      (this.flatListRef as any).scrollToOffset(opts);
    }
  }

  public forceRefresh() {
    this.onRefresh();
  }

  public render() {
    const props = this.props;
    const state = this.state;
    const isEmpty =
      state.data.length === 0 &&
      !state.isExpectingMore &&
      !state.refreshing &&
      !this.isPulling;
    const ListFooterComponent =
      props.ListFooterComponent && state.isExpectingMore
        ? props.ListFooterComponent
        : isEmpty
        ? props.ListEmptyComponent
        : null;
    const isLoadingInitial = state.isExpectingMore && state.data.length === 0;

    return createElement(FlatList, {
      onEndReachedThreshold: DEFAULT_END_THRESHOLD,
      ...props,
      onRefresh: undefined,
      ListEmptyComponent: undefined,
      ref: (r: any) => {
        this.flatListRef = r;
      },
      refreshControl: props.refreshable
        ? createElement(RefreshControl, {
            colors: props.refreshColors ?? ['#000000'],
            onRefresh: this._onRefresh,
            progressViewOffset: props.progressViewOffset,
            refreshing: state.refreshing ?? isLoadingInitial,
          })
        : undefined,
      data: state.data,
      extraData: state.updateInt,
      onEndReached: this._onEndReached,
      ListFooterComponent,
    } as any) as any;
  }
}

export default PullFlatList;
