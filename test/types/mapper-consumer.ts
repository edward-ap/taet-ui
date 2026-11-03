import { List, TreeList, ListPortProvider, TreeListPortProvider, ConnectorLayer, MapperWindow } from 'taet-ui/experimental';
import type { ItemGeometry, ConnectorLayerEvents } from 'taet-ui/experimental';

export function mapperTypes(container: HTMLElement) {
  const list = new List<{ id: number; text: string }>(container);
  const geometry: ItemGeometry<number> = list.getItemGeometry(0);
  list.events.on('itemGeometryChange', event => event.source.getVisibleItemGeometries());
  const provider = new ListPortProvider(list);
  const tree = new TreeList<{ id: string; parentId?: string; text: string }>(container, {
    renderItem:(item, context) => `${context.level}: ${item.text}`
  });
  const treeProvider = new TreeListPortProvider(tree);
  const layer = new ConnectorLayer({ canConnect:({ connector }) => connector.source.controlId !== connector.target.controlId });
  layer.registerProvider(provider);
  layer.registerProvider(treeProvider);
  layer.events.on('beforeConnectionChange', (event: ConnectorLayerEvents['beforeConnectionChange']) => { event.cancel = false; });
  layer.events.on('connectionRemove', event => event.connector.id);
  const window = new MapperWindow({ content:list });
  window.events.on('geometryInvalidate', event => event.source.getBounds());
  const connection = layer.connect({ controlId:'one', itemId:0 }, { controlId:'two', itemId:'id' });
  if (connection) { layer.startReconnect(connection.id, 'source'); layer.cancelConnection(); layer.removeConnection(connection.id); }
  return geometry;
}
