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
* (other props) all other props from FlatList are supported, except `data` and `extraData`, because this module's purpose is to manage that for you
