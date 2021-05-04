# PullFlatList

```
npm install --save pull-flat-list
```

A React Native component as a variant of FlatList, which takes a pull-stream as prop and automatically pulls from that when the scroll position gets closer to the end.

## Usage

```js
import PullFlatList from 'pull-flat-list';

// ... then in a render function ...
<PullFlatList
  getScrollStream={() => pull.values(['one', 'two', 'three'])}
  renderItem={({ item }) => <Text>{item.key}</Text>}
/>;
```

## Props

* `getScrollStream` (required) Factory function which returns a pull stream to be used when scrolling the FlatList, to pull more items and append them to the list. **Note!** This prop is not the pull stream directly, it's a function that returns a pull stream.
* `getPrefixStream` (optional) Factory function which returns a pull stream to be used to prepend items to the FlatList, regardless of scrolling.
* `pullAmount` (optional, default is 30) How many items to pull from the pull stream when the scroll position reaches the end.
* `refreshable` (optional, default is false) Boolean indicating whether or not this list can be refreshed with the pull-to-refresh gesture.
* `refreshColors` (optional) The colors (at least one) that will be used to draw the refresh indicator.
* `onInitialPullDone` (optional) Called once when the PullFlatList has completed its first burst of pulls of data. Emits the number of items in the data array.
* `onPullingComplete` (optional) Called once when the PullFlatList has completed pulling all data from the source.
* (other props) all other props from FlatList are supported, except `data` and `extraData`, because this module's purpose is to manage that for you

## Methods

* `forceRefresh(retainable?: boolean)` This method will force a refresh to occur,
causing a pull of the scroll stream to start over. However, this method will **not** cause the callback `onInitialPullDone` to be triggered. The argument `retainable` signals (when `false`) whether you want the FlatList's rendering to be "cleaned" or (when `true`) if you want the FlatList to retain the rendering of the previous views *until* the first pull returns. By default, `retainable = false`.
