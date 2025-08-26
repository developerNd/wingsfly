import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {useNavigation, useRoute} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Headers from '../../Components/Headers';
import BottomToolbar from '../../Components/BottomToolbar';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';
import {mindMapService} from '../../services/api/mindMapService';
import DraggableMindMapCanvas from '../../Components/DraggableMindMapCanvas';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const VERTICAL_GAP = HP(12);
const HORIZONTAL_GAP = WP(12);

const MindMapScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const taskData = route.params || {};
  const taskTitle = taskData.taskTitle || taskData.title || '';
  const taskId = taskData.taskId || taskData.id || null;
  const dueDate = taskData.dueDate || '';

  // Add long press tracking
  const longPressTimer = useRef(null);
  const touchStartTime = useRef(null);
  const isLongPressing = useRef(false);

  // Database-backed states
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState('');
  const [nodeNumbers, setNodeNumbers] = useState(new Map());
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [isWriteNoteVisible, setIsWriteNoteVisible] = useState(false);
  const [selectedNodeForNote, setSelectedNodeForNote] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [holdPressedNodeId, setHoldPressedNodeId] = useState(null);
  const [showBottomToolbar, setShowBottomToolbar] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);

  // Database node mapping
  const [dbNodeIdMapping, setDbNodeIdMapping] = useState(new Map());
  const nodeIdCounter = useRef(2);

  // Auto-save timeout ref for notes
  const noteAutoSaveTimeout = useRef(null);

  // NEW: Save complete mind map data to database
  const saveMindMapToDatabase = async () => {
    if (!taskId || nodes.length === 0) return;

    try {
      const mindMapData = {
        nodes,
        connections,
        nodeIdMapping: dbNodeIdMapping,
      };

      await mindMapService.saveMindMapData(taskId, mindMapData);
      console.log('Mind map saved to database');
    } catch (error) {
      console.error('Error saving mind map to database:', error);
    }
  };

  // Load existing mind map data on component mount
  useEffect(() => {
    loadMindMapData();
  }, [taskId]);

  // Auto-save mind map data
  useEffect(() => {
    if (nodes.length > 0 && !loading) {
      const timeoutId = setTimeout(() => {
        saveMindMapToDatabase();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, connections, taskId, loading]);

  // UPDATED: Load mind map data with JSONB support
  const loadMindMapData = async () => {
    if (!taskId) {
      await createInitialRootNode();
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Try to load from new JSONB storage first
      const savedMindMapData = await mindMapService.loadMindMapData(taskId);

      if (
        savedMindMapData &&
        savedMindMapData.nodes &&
        savedMindMapData.nodes.length > 0
      ) {
        // Load from new JSONB storage
        console.log('Loading from JSONB storage');
        setNodes(savedMindMapData.nodes);
        setConnections(savedMindMapData.connections || []);
        setDbNodeIdMapping(savedMindMapData.nodeIdMapping || new Map());

        if (savedMindMapData.nodes.length > 0) {
          const maxId = Math.max(
            ...savedMindMapData.nodes.map(n => parseInt(n.id)),
          );
          nodeIdCounter.current = maxId + 1;
        }
      } else {
        // Fallback: Try to load from old individual nodes storage
        console.log('Falling back to legacy node storage');
        const dbNodes = await mindMapService.getMindMapNodes(taskId);

        if (dbNodes.length === 0) {
          await createInitialRootNode();
        } else {
          const convertedData = convertDbNodesToUIFormat(dbNodes, {});
          setNodes(convertedData.nodes);
          setConnections(convertedData.connections);
          setDbNodeIdMapping(convertedData.mapping);

          if (convertedData.nodes.length > 0) {
            const maxId = Math.max(
              ...convertedData.nodes.map(n => parseInt(n.id)),
            );
            nodeIdCounter.current = maxId + 1;
          }

          // Migrate to new JSONB storage
          setTimeout(() => {
            saveMindMapToDatabase();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error loading mind map data:', error);
      Alert.alert('Error', 'Failed to load mind map data');
      await createInitialRootNode();
    } finally {
      setLoading(false);
    }
  };

  const createInitialRootNode = async () => {
    const rootNode = {
      id: '1',
      text: taskTitle,
      x: WP(22),
      y: HP(12),
      parentId: null,
      color: '#F7F7F7',
      borderColor: '#535353',
      level: 0,
      notes: null,
      isCompleted: false,
    };

    setNodes([rootNode]);
    setConnections([]);

    const mapping = new Map();
    mapping.set('1', 'root_1');
    setDbNodeIdMapping(mapping);
  };

  // Determine connection direction based on node positions and parent-child relationship
  const determineConnectionDirection = (
    parentNode,
    childNode,
    savedDirection = null,
  ) => {
    if (savedDirection) {
      return savedDirection;
    }

    // Root node (level 0) connections are always vertical (bottom)
    if (parentNode.level === 0) {
      return 'bottom';
    }

    // For level 1+ nodes, determine based on position relative to parent
    const parentNodeWidth = getNodeWidth(parentNode.level);
    const horizontalThreshold = parentNodeWidth + HORIZONTAL_GAP / 2;

    // If child is significantly to the right of parent, it's horizontal
    if (childNode.x > parentNode.x + horizontalThreshold) {
      return 'right';
    }

    // Otherwise, it's vertical
    return 'bottom';
  };

  // Legacy conversion function (kept for backward compatibility)
  const convertDbNodesToUIFormat = (dbNodes, savedPositions = {}) => {
    const nodes = [];
    const connections = [];
    const mapping = new Map();

    if (dbNodes.length === 0) return {nodes, connections, mapping};

    const dbNodeMap = new Map();
    dbNodes.forEach(node => {
      dbNodeMap.set(node.id, node);
    });

    const sortedDbNodes = [...dbNodes].sort((a, b) => {
      if (!a.parent_id && b.parent_id) return -1;
      if (a.parent_id && !b.parent_id) return 1;
      return a.id - b.id;
    });

    // First pass: Create all nodes
    sortedDbNodes.forEach((dbNode, index) => {
      const localId = (index + 1).toString();
      mapping.set(localId, dbNode.id);

      const level = calculateNodeLevel(dbNode, dbNodeMap);
      const colors = getNodeColors(
        level,
        dbNode.parent_id,
        dbNode.is_completed || false,
      );

      let position;
      const savedPos = savedPositions[dbNode.id];
      if (savedPos && savedPos.x !== undefined && savedPos.y !== undefined) {
        position = {x: savedPos.x, y: savedPos.y};
      } else {
        position = calculateNodePosition(dbNode, dbNodeMap, level, nodes);
      }

      const uiNode = {
        id: localId,
        text: dbNode.node_name || '',
        x: position.x,
        y: position.y,
        parentId: null,
        color: colors.color,
        borderColor: colors.borderColor,
        level: level,
        dbId: dbNode.id,
        notes: dbNode.notes || null,
        isCompleted: dbNode.is_completed || false,
      };

      nodes.push(uiNode);
    });

    // Second pass - Create connections with proper direction determination
    sortedDbNodes.forEach((dbNode, index) => {
      const currentNode = nodes[index];

      if (dbNode.parent_id) {
        const parentNode = nodes.find(n => n.dbId === dbNode.parent_id);

        if (parentNode) {
          currentNode.parentId = parentNode.id;

          const savedPos = savedPositions[dbNode.id];
          const savedDirection = savedPos?.connectionDirection;
          const direction = determineConnectionDirection(
            parentNode,
            currentNode,
            savedDirection,
          );
          connections.push({
            id: `${parentNode.id}-${currentNode.id}`,
            fromId: parentNode.id,
            toId: currentNode.id,
            direction: direction,
          });
        }
      }
    });

    console.log(
      `Converted ${nodes.length} nodes and ${connections.length} connections from database`,
    );
    return {nodes, connections, mapping};
  };

  const calculateNodeLevel = (node, nodeMap) => {
    let level = 0;
    let currentNode = node;

    while (currentNode.parent_id) {
      level++;
      currentNode = nodeMap.get(currentNode.parent_id);
      if (!currentNode) break;
    }

    return level;
  };

  const calculateNodePosition = (
    dbNode,
    nodeMap,
    level,
    existingNodes = [],
  ) => {
    if (level === 0) {
      return {x: WP(22), y: HP(12)};
    }

    let parentNode = null;
    if (dbNode.parent_id) {
      parentNode = existingNodes.find(n => n.dbId === dbNode.parent_id);
    }

    if (!parentNode) {
      const baseX = level === 1 ? WP(22) + WP(50) : WP(22) + level * WP(45);
      const baseY = HP(12) + level * HP(15);
      return {x: baseX, y: baseY};
    }

    const direction = level === 1 ? 'bottom' : 'right';
    const parentNodeWidth = getNodeWidth(parentNode.level);

    let baseX, baseY;

    if (direction === 'right') {
      baseX = parentNode.x + parentNodeWidth + HORIZONTAL_GAP;
      baseY = parentNode.y;
    } else {
      if (parentNode.level === 0) {
        baseX = parentNode.x + parentNodeWidth;
        baseY = parentNode.y + VERTICAL_GAP;
      } else {
        baseX = parentNode.x;
        baseY = parentNode.y + VERTICAL_GAP;
      }
    }

    const siblings = existingNodes.filter(
      n => n.parentId === parentNode.id && n.dbId !== dbNode.id,
    );

    if (direction === 'bottom' && siblings.length > 0) {
      const lowestSibling = siblings.reduce((lowest, current) =>
        current.y > lowest.y ? current : lowest,
      );
      baseY = lowestSibling.y + VERTICAL_GAP;
    } else if (direction === 'right' && siblings.length > 0) {
      const rightmostSibling = siblings.reduce((rightmost, current) =>
        current.x > rightmost.x ? current : rightmost,
      );
      const siblingWidth = getNodeWidth(rightmostSibling.level);
      baseX = rightmostSibling.x + siblingWidth + HORIZONTAL_GAP;
    }

    return {x: baseX, y: baseY};
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleNextPress = async () => {
    try {
      await saveMindMapToDatabase();

      const mindMapData = {
        ...taskData,
        nodes,
        connections,
        taskTitle,
        taskId,
        dueDate,
      };

      console.log('Mind Map data:', mindMapData);
      navigation.navigate('LandingPage', mindMapData);
    } catch (error) {
      console.error('Error saving mind map:', error);
      Alert.alert('Error', 'Failed to save mind map changes');
    }
  };

  const getNodeWidth = level => (level === 0 ? WP(45) : WP(38));
  const getBorderWidth = level => (level === 0 ? 0.2 : 0.7);

  // Updated getNodeColors function to handle completion
  const getNodeColors = (level, parentId, isCompleted = false) => {
    if (isCompleted) {
      return {color: '#91CFBB', borderColor: '#4CAF50'};
    }

    if (level === 0) return {color: '#F5F5F5', borderColor: '#999999'};
    if (level === 1) return {color: '#FFFFFF', borderColor: '#999999'};
    if (level === 2) return {color: '#FFFFFF', borderColor: '#999999'};
    return {color: '#FFFFFF', borderColor: '#999999'};
  };

  // Connection points calculation
  const getConnectionPoints = (fromNodeId, toNodeId, direction) => {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    const toNode = nodes.find(n => n.id === toNodeId);

    if (!fromNode || !toNode) {
      console.warn(
        `Connection nodes not found: from=${fromNodeId}, to=${toNodeId}`,
      );
      return {fromX: 0, fromY: 0, toX: 0, toY: 0};
    }

    const fromNodeWidth = getNodeWidth(fromNode.level);
    const toNodeWidth = getNodeWidth(toNode.level);
    const circleSize = WP(6);
    const arrowSize = WP(8);
    const nodeHeight = HP(5.5);

    let fromX, fromY, toX, toY;

    if (direction === 'right') {
      fromX = fromNode.x + fromNodeWidth + circleSize / 2;
      fromY = fromNode.y + nodeHeight / 2;
      toX = toNode.x - arrowSize / 6;
      toY = toNode.y + nodeHeight / 2;
    } else {
      if (fromNode.level === 0) {
        fromX = fromNode.x + fromNodeWidth;
        fromY = fromNode.y + nodeHeight + circleSize / 2;
      } else {
        fromX = fromNode.x;
        fromY = fromNode.y + nodeHeight + circleSize / 2;
      }

      toX = toNode.x;
      toY = toNode.y - arrowSize / 6;
    }

    return {fromX, fromY, toX, toY};
  };

  const generateNodeNumbers = (nodeList, connectionsList) => {
    const nodeNumbers = new Map();

    if (!nodeList || nodeList.length === 0) return nodeNumbers;
    if (!connectionsList) connectionsList = [];

    const sortNodesByPosition = nodeArray => {
      return nodeArray.sort((a, b) => {
        if (Math.abs(a.y - b.y) > HP(2)) {
          return a.y - b.y;
        }
        return a.x - b.x;
      });
    };

    const rootNode = nodeList.find(node => node.level === 0 && !node.parentId);
    if (!rootNode) return nodeNumbers;

    const nonRootNodes = nodeList.filter(node => node.level > 0);
    if (nonRootNodes.length === 0) return nodeNumbers;

    const leftmostX = Math.min(...nonRootNodes.map(node => node.x));
    const firstColumnNodes = nonRootNodes.filter(
      node => Math.abs(node.x - leftmostX) < WP(5),
    );

    const sortedFirstColumn = sortNodesByPosition(firstColumnNodes);
    sortedFirstColumn.forEach((node, index) => {
      nodeNumbers.set(node.id, `${index + 1}`);
    });

    const getNodeDirection = (parentNode, childNode) => {
      const getNodeWidthLocal = level => (level === 0 ? WP(45) : WP(38));
      const parentWidth = getNodeWidthLocal(parentNode.level);

      if (childNode.x > parentNode.x + parentWidth + WP(10)) {
        return 'right';
      }
      return 'bottom';
    };

    const processOtherNodes = () => {
      nonRootNodes.forEach(node => {
        if (nodeNumbers.has(node.id)) return;
        const parentNode = nodeList.find(n => n.id === node.parentId);
        if (!parentNode || !nodeNumbers.has(parentNode.id)) return;

        const parentNumber = nodeNumbers.get(parentNode.id);

        let direction = 'bottom';
        const connection = connectionsList.find(
          conn => conn.fromId === parentNode.id && conn.toId === node.id,
        );

        if (connection && connection.direction) {
          direction = connection.direction;
        } else {
          direction = getNodeDirection(parentNode, node);
        }

        if (direction === 'right') {
          const existingHorizontalChildren = nonRootNodes.filter(n => {
            if (n.parentId !== parentNode.id || n.id === node.id) return false;
            const siblingConnection = connectionsList.find(
              conn => conn.fromId === parentNode.id && conn.toId === n.id,
            );
            if (siblingConnection) {
              return siblingConnection.direction === 'right';
            }
            return getNodeDirection(parentNode, n) === 'right';
          });

          const horizontalIndex = existingHorizontalChildren.length;
          nodeNumbers.set(node.id, `${parentNumber}.${horizontalIndex + 1}`);
        } else if (direction === 'bottom') {
          const verticalSiblings = nonRootNodes.filter(n => {
            if (n.parentId !== node.parentId) return false;
            const siblingConnection = connectionsList.find(
              conn => conn.fromId === parentNode.id && conn.toId === n.id,
            );
            if (siblingConnection) {
              return siblingConnection.direction === 'bottom';
            }
            return getNodeDirection(parentNode, n) === 'bottom';
          });

          const sortedSiblings = sortNodesByPosition(verticalSiblings);
          const siblingIndex = sortedSiblings.findIndex(n => n.id === node.id);

          if (siblingIndex !== -1) {
            const parentParts = parentNumber.split('.');
            const lastNumber = parseInt(parentParts[parentParts.length - 1]);
            const newLastNumber = lastNumber + siblingIndex + 1;

            if (parentParts.length === 1) {
              nodeNumbers.set(node.id, `${parentNumber}.${siblingIndex + 1}`);
            } else {
              const baseParts = parentParts.slice(0, -1);
              nodeNumbers.set(
                node.id,
                `${baseParts.join('.')}.${newLastNumber}`,
              );
            }
          }
        }
      });
    };

    for (let i = 0; i < 5; i++) {
      processOtherNodes();
    }

    return nodeNumbers;
  };

  const getNodeDisplayText = (node, numbers) => {
    const number = numbers.get(node.id);
    if (number && node.text.trim()) {
      return `${number}) ${node.text}`;
    }
    return node.text;
  };

  React.useEffect(() => {
    const newNumbers = generateNodeNumbers(nodes, connections);
    setNodeNumbers(newNumbers);
  }, [nodes, connections]);

  const isPositionOccupied = (x, y, excludeNodeId = null) => {
    const nodeHeight = HP(5.5);
    const buffer = HP(2);
    return nodes.some(node => {
      if (excludeNodeId && node.id === excludeNodeId) return false;
      const nodeWidth = getNodeWidth(node.level);
      const overlapX =
        x < node.x + nodeWidth + buffer && x + nodeWidth + buffer > node.x;
      const overlapY =
        y < node.y + nodeHeight + buffer && y + nodeHeight + buffer > node.y;
      return overlapX && overlapY;
    });
  };

  const findNextAvailablePosition = (
    baseX,
    baseY,
    direction = 'bottom',
    parentNode,
  ) => {
    let newX = baseX;
    let newY = baseY;

    if (direction === 'right') {
      newX = baseX;
      newY = parentNode.y;
    } else if (direction === 'bottom') {
      newX = baseX;
      const allNodes = nodes.filter(node => node.id !== parentNode.id);
      if (allNodes.length > 0) {
        const globalLowestNode = allNodes.reduce((lowest, current) =>
          current.y > lowest.y ? current : lowest,
        );
        newY = globalLowestNode.y + VERTICAL_GAP;
      } else {
        newY = baseY;
      }
    }

    let tryCount = 0;
    while (isPositionOccupied(newX, newY) && tryCount < 10) {
      if (direction === 'right') {
        newX += WP(12);
      } else {
        newY += HP(12);
      }
      tryCount++;
    }
    return {x: newX, y: newY};
  };

  const updateNodeText = async (nodeId, newText) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId ? {...node, text: newText} : node,
      ),
    );
  };

  // Auto-save notes function
  const updateNodeNotes = async (nodeId, newNotes) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId ? {...node, notes: newNotes} : node,
      ),
    );
  };

  // Add completion handler
  const handleNodeCompletion = async nodeId => {
    setNodes(prevNodes =>
      prevNodes.map(node => {
        if (node.id === nodeId) {
          const newCompletionState = !node.isCompleted;
          const colors = getNodeColors(
            node.level,
            node.parentId,
            newCompletionState,
          );
          return {
            ...node,
            isCompleted: newCompletionState,
            color: colors.color,
            borderColor: colors.borderColor,
          };
        }
        return node;
      }),
    );
  };

  const addChildNode = async (parentId, direction) => {
    const parentNode = nodes.find(node => node.id === parentId);
    if (!parentNode) return;

    if (parentNode.level === 0 && direction === 'right') {
      return;
    }

    let baseX, baseY;
    const newLevel = parentNode.level + 1;
    const colors = getNodeColors(newLevel, parentId, false);
    const parentNodeWidth = getNodeWidth(parentNode.level);

    if (direction === 'right') {
      baseX = parentNode.x + parentNodeWidth + HORIZONTAL_GAP;
      baseY = parentNode.y;
    } else if (direction === 'bottom') {
      if (parentNode.level === 0) {
        baseX = parentNode.x + parentNodeWidth;
        baseY = parentNode.y + VERTICAL_GAP;
      } else {
        baseX = parentNode.x;
        baseY = parentNode.y + VERTICAL_GAP;
      }
    }

    const exists = nodes.some(
      n => Math.abs(n.x - baseX) < WP(2) && Math.abs(n.y - baseY) < HP(2),
    );
    if (exists) return;

    const availablePosition = findNextAvailablePosition(
      baseX,
      baseY,
      direction,
      parentNode,
    );

    const exists2 = nodes.some(
      n =>
        Math.abs(n.x - availablePosition.x) < WP(2) &&
        Math.abs(n.y - availablePosition.y) < HP(2),
    );
    if (exists2) return;

    const newNodeId = nodeIdCounter.current.toString();
    nodeIdCounter.current += 1;

    const newNode = {
      id: newNodeId,
      text: '',
      x: availablePosition.x,
      y: availablePosition.y,
      parentId: parentId,
      color: colors.color,
      borderColor: colors.borderColor,
      level: newLevel,
      notes: null,
      isCompleted: false,
    };

    const newConnection = {
      id: `${parentId}-${newNodeId}`,
      fromId: parentId,
      toId: newNodeId,
      direction: direction,
    };

    setNodes(prevNodes => [...prevNodes, newNode]);
    setConnections(prevConnections => [...prevConnections, newConnection]);

    const newDbId = `node_${newNodeId}_${Date.now()}`;
    setDbNodeIdMapping(prev => {
      const updated = new Map(prev);
      updated.set(newNodeId, newDbId);
      return updated;
    });
  };

  const deleteNode = async nodeId => {
    if (nodeId === '1') return;

    const findAllChildren = parentId => {
      const children = nodes.filter(node => node.parentId === parentId);
      let allDescendants = [...children];

      children.forEach(child => {
        allDescendants = [...allDescendants, ...findAllChildren(child.id)];
      });

      return allDescendants;
    };

    const nodeToDelete = nodes.find(node => node.id === nodeId);
    if (!nodeToDelete) return;

    const allNodesToDelete = [nodeToDelete, ...findAllChildren(nodeId)];
    const nodeIdsToDelete = allNodesToDelete.map(node => node.id);

    setNodes(prevNodes =>
      prevNodes.filter(node => !nodeIdsToDelete.includes(node.id)),
    );

    setConnections(prevConnections =>
      prevConnections.filter(
        conn =>
          !nodeIdsToDelete.includes(conn.fromId) &&
          !nodeIdsToDelete.includes(conn.toId),
      ),
    );

    setDbNodeIdMapping(prev => {
      const updated = new Map(prev);
      nodeIdsToDelete.forEach(id => updated.delete(id));
      return updated;
    });

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }

    if (selectedNodeForNote && selectedNodeForNote.id === nodeId) {
      setSelectedNodeForNote(null);
      setIsWriteNoteVisible(false);
    }
  };

  const handleNodePress = node => {
    setSelectedNodeId(node.id);
  };

  const handleNodeLongPress = node => {
    if (node.text.trim().length > 0) {
      setSelectedNodeForNote(node);
      setNewNoteText(node.notes || '');
      setIsWriteNoteVisible(true);
      setHoldPressedNodeId(node.id);
      isLongPressing.current = true;
    }
  };

  const handlePressIn = node => {
    if (node.text.trim().length > 0) {
      setHoldPressedNodeId(node.id);
      touchStartTime.current = Date.now();
      isLongPressing.current = false;

      longPressTimer.current = setTimeout(() => {
        isLongPressing.current = true;
        handleNodeLongPress(node);
      }, 500);
    }
  };

  const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!isWriteNoteVisible) {
      setHoldPressedNodeId(null);
    }

    setTimeout(() => {
      isLongPressing.current = false;
    }, 100);
  };

  const hideWriteNote = () => {
    setIsWriteNoteVisible(false);
    setSelectedNodeForNote(null);
    setNewNoteText('');
    setHoldPressedNodeId(null);
    isLongPressing.current = false;

    if (noteAutoSaveTimeout.current) {
      clearTimeout(noteAutoSaveTimeout.current);
    }
  };

  const handleOutsidePress = () => {
    setShowBottomToolbar(false);
    setSelectedNodeId(null);
    setIsUserTyping(false);
    hideWriteNote();
  };

  const handleNodeFocus = nodeId => {
    setFocusedNodeId(nodeId);
    setIsUserTyping(true);
    setShowBottomToolbar(true);
    setSelectedNodeId(nodeId);
  };

  const handleNodeBlur = () => {
    setFocusedNodeId(null);
    setIsUserTyping(false);

    setTimeout(() => {
      if (!isUserTyping) {
        setShowBottomToolbar(false);
      }
    }, 200);
  };

  const handleTextChange = (nodeId, text) => {
    updateNodeText(nodeId, text);

    if (text.length > 0) {
      setIsUserTyping(true);
      setShowBottomToolbar(true);
      setSelectedNodeId(nodeId);
    }
  };

  const handleNoteTextChange = text => {
    setNewNoteText(text);

    if (noteAutoSaveTimeout.current) {
      clearTimeout(noteAutoSaveTimeout.current);
    }

    noteAutoSaveTimeout.current = setTimeout(() => {
      if (selectedNodeForNote) {
        updateNodeNotes(selectedNodeForNote.id, text);
      }
    }, 1000);
  };

  // Bottom toolbar handlers
  const handleAddPress = () => {
    console.log('Add pressed');
  };

  const handleDeletePress = () => {
    if (selectedNodeId) {
      Alert.alert(
        'Delete Node',
        'Are you sure you want to delete this node and all its children?',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteNode(selectedNodeId),
          },
        ],
      );
    }
  };

  const handleMorePress = () => {
    console.log('More pressed');
  };

  const handleLeftActionPress = () => {
    if (selectedNodeId) {
      addChildNode(selectedNodeId, 'bottom');
    } else {
      const rootNode = nodes.find(node => node.level === 0);
      if (rootNode) {
        addChildNode(rootNode.id, 'bottom');
      }
    }
  };

  const handleRightActionPress = () => {
    if (selectedNodeId) {
      const selectedNode = nodes.find(node => node.id === selectedNodeId);
      if (selectedNode && selectedNode.level > 0) {
        addChildNode(selectedNodeId, 'right');
      }
    }
  };

  const renderNode = node => {
    const nodeWidth = getNodeWidth(node.level);
    const borderWidth = getBorderWidth(node.level);
    const displayText = getNodeDisplayText(node, nodeNumbers);
    const isInputFocused = focusedNodeId === node.id;
    const shouldShowNumber =
      node.text.trim() && !isInputFocused && displayText !== node.text;
    const isHoldPressed = holdPressedNodeId === node.id;
    const isSelected = selectedNodeId === node.id && isUserTyping;

    return (
      <View
        key={node.id}
        style={[
          styles.nodeContainer,
          {
            left: node.x,
            top: node.y,
          },
        ]}>
        <TouchableOpacity
          style={[
            styles.nodeBox,
            {
              backgroundColor: node.color,
              borderColor: isSelected ? '#292A6E' : node.borderColor,
              width: nodeWidth,
              borderWidth: isSelected ? 0.7 : borderWidth,
            },
          ]}
          onPress={() => handleNodePress(node)}
          onLongPress={() => handleNodeLongPress(node)}
          onPressIn={() => handlePressIn(node)}
          onPressOut={handlePressOut}
          activeOpacity={1}
          delayLongPress={500}>
          <TextInput
            style={[
              styles.nodeInput,
              shouldShowNumber && styles.hiddenInput,
              node.isCompleted && styles.completedNodeText,
            ]}
            placeholder={
              node.level === 0
                ? taskTitle
                  ? ''
                  : 'Enter your goal...'
                : 'Enter text...'
            }
            placeholderTextColor="#999"
            value={node.text}
            onChangeText={text => handleTextChange(node.id, text)}
            onFocus={() => handleNodeFocus(node.id)}
            onBlur={handleNodeBlur}
            multiline={true}
            textAlignVertical="center"
          />

          {shouldShowNumber && (
            <TouchableOpacity
              style={styles.numberOverlay}
              onPress={() => handleNodeFocus(node.id)}
              onLongPress={() => handleNodeLongPress(node)}
              onPressIn={() => handlePressIn(node)}
              onPressOut={handlePressOut}
              activeOpacity={1}
              delayLongPress={500}>
              <Text
                style={[
                  styles.numberedDisplayText,
                  node.isCompleted && styles.completedNodeText,
                ]}>
                {displayText}
              </Text>
            </TouchableOpacity>
          )}

          {isHoldPressed && node.text.trim().length > 0 && (
            <View style={styles.holdPressIconContainer}>
              <Image
                source={Icons.Triangle}
                style={styles.holdPressIcon}
                resizeMode="contain"
              />
            </View>
          )}

          {node.notes && node.notes.trim() && (
            <View style={styles.noteIndicator}>
              <Text style={styles.noteIndicatorText}>📝</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Render connections
  const renderConnections = () => {
    console.log('Rendering connections:', connections.length);
    return connections
      .map(connection => {
        if (!connection.fromId || !connection.toId) {
          console.warn(`Invalid connection found: ${connection.id}`);
          return null;
        }

        const {fromX, fromY, toX, toY} = getConnectionPoints(
          connection.fromId,
          connection.toId,
          connection.direction,
        );

        return (
          <Path
            key={connection.id}
            d={`M ${fromX} ${fromY} L ${toX} ${toY}`}
            stroke="#696969"
            strokeWidth="2.4"
            fill="none"
            strokeDasharray="6,6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })
      .filter(Boolean);
  };

  // Render connection images
  const renderConnectionImages = () => {
    const imageElements = [];

    connections.forEach(connection => {
      if (!connection.fromId || !connection.toId) {
        return;
      }

      const fromNode = nodes.find(n => n.id === connection.fromId);
      const toNode = nodes.find(n => n.id === connection.toId);

      if (!fromNode || !toNode) {
        console.warn(
          `Connection nodes not found: from=${connection.fromId}, to=${connection.toId}`,
        );
        return;
      }

      const fromNodeWidth = getNodeWidth(fromNode.level);
      const nodeHeight = HP(5.5);

      let circleX, circleY;
      if (connection.direction === 'right') {
        circleX = fromNode.x + fromNodeWidth;
        circleY = fromNode.y + nodeHeight / 2;
      } else {
        if (fromNode.level === 0) {
          circleX = fromNode.x + fromNodeWidth;
          circleY = fromNode.y + nodeHeight;
        } else {
          circleX = fromNode.x;
          circleY = fromNode.y + nodeHeight;
        }
      }

      let arrowX, arrowY;
      if (connection.direction === 'right') {
        arrowX = toNode.x - WP(5.5);
        arrowY = toNode.y + nodeHeight / 2 - WP(2);
      } else {
        arrowX = toNode.x - WP(4);
        arrowY = toNode.y - HP(1.6);
      }

      let circleRotation = 0;
      if (connection.direction === 'right') {
        circleRotation = 270;
      }

      let arrowAngle = 0;
      if (connection.direction === 'right') {
        arrowAngle = 270;
      } else if (connection.direction === 'bottom') {
        arrowAngle = 360;
      }

      let circleOffsetX, circleOffsetY;
      if (connection.direction === 'right') {
        circleOffsetX = WP(1.8);
        circleOffsetY = WP(3);
      } else {
        circleOffsetX = WP(3);
        circleOffsetY = WP(3);
      }

      imageElements.push(
        <View
          key={`start-${connection.id}`}
          style={[
            styles.connectionStartPoint,
            {
              left: circleX - circleOffsetX,
              top: circleY - circleOffsetY,
              transform: [{rotate: `${circleRotation}deg`}],
            },
          ]}>
          <Image
            source={Icons.MindCircle}
            style={styles.startPointImage}
            resizeMode="contain"
          />
        </View>,
      );

      imageElements.push(
        <View
          key={`arrow-${connection.id}`}
          style={[
            styles.connectionArrow,
            {
              left: arrowX,
              top: arrowY,
              transform: [{rotate: `${arrowAngle}deg`}],
            },
          ]}>
          <Image
            source={Icons.MindArrow}
            style={styles.arrowImage}
            resizeMode="contain"
          />
        </View>,
      );
    });

    return imageElements;
  };

  const renderWriteNoteSection = () => {
    if (!isWriteNoteVisible || !selectedNodeForNote) return null;

    const nodeWidth = getNodeWidth(selectedNodeForNote.level);
    const noteWidth = WP(33);

    const noteX = selectedNodeForNote.x + nodeWidth / 2 - noteWidth / 2;
    const noteY = selectedNodeForNote.y - HP(8);

    return (
      <View
        style={[
          styles.writeNoteContainer,
          {
            left: noteX,
            top: noteY,
          },
        ]}>
        <View style={styles.noteInputContainer}>
          <View style={styles.noteInputContent}>
            <View style={styles.noteHeader}>
              <View style={styles.noteAuthorContainer}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>U</Text>
                </View>
                <View>
                  <Text style={styles.noteAuthor}>User</Text>
                  <Text style={styles.noteTime}>
                    {new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    Today
                  </Text>
                </View>
              </View>
            </View>
            <TextInput
              style={styles.noteInput}
              placeholder="Write Note..."
              placeholderTextColor="#575656"
              value={newNoteText}
              onChangeText={handleNoteTextChange}
              multiline={true}
              autoFocus={true}
              onBlur={() => {
                if (
                  selectedNodeForNote &&
                  newNoteText !== selectedNodeForNote.notes
                ) {
                  updateNodeNotes(selectedNodeForNote.id, newNoteText);
                }
                setTimeout(() => {
                  hideWriteNote();
                }, 100);
              }}
            />
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading Mind Map...</Text>
      </View>
    );
  }

  // IMPROVED: Calculate canvas dimensions with better padding
  const maxX =
    nodes.length > 0
      ? Math.max(...nodes.map(node => node.x + getNodeWidth(node.level)))
      : WP(100);
  const maxY =
    nodes.length > 0 ? Math.max(...nodes.map(node => node.y + HP(6))) : HP(100);

  // Add generous padding to canvas size to ensure smooth scrolling
  const canvasWidth = Math.max(maxX + WP(100), screenWidth * 2.5);
  const canvasHeight = Math.max(maxY + HP(50), screenHeight * 2.5);

  // Get selected node for toolbar
  const selectedNode = nodes.find(node => node.id === selectedNodeId);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
      <View style={styles.headerWrapper}>
        <Headers
          title={taskTitle ? `Task: ${taskTitle}` : 'Set Long Term Goal'}>
          <TouchableOpacity onPress={handleNextPress}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <View style={styles.mainContent}>
        <DraggableMindMapCanvas
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onOutsidePress={handleOutsidePress}
          style={styles.canvasContainer}>
          <Svg
            height={canvasHeight}
            width={canvasWidth}
            style={StyleSheet.absoluteFillObject}>
            {renderConnections()}
          </Svg>

          {nodes.map(renderNode)}
          {renderConnectionImages()}
          {renderWriteNoteSection()}
        </DraggableMindMapCanvas>
      </View>

      {showBottomToolbar && isUserTyping && (
        <BottomToolbar
          onAddPress={handleAddPress}
          onDeletePress={handleDeletePress}
          onMorePress={handleMorePress}
          onLeftActionPress={handleLeftActionPress}
          onRightActionPress={handleRightActionPress}
          onCompletePress={handleNodeCompletion}
          selectedNodeId={selectedNodeId}
          isNodeCompleted={selectedNode?.isCompleted || false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FS(2),
    color: '#666',
    fontFamily: 'OpenSans-SemiBold',
  },
  headerWrapper: {
    marginTop: HP(2.2),
    paddingBottom: HP(0.25),
  },
  nextText: {
    fontSize: FS(1.8),
    color: '#0059FF',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  mainContent: {
    flex: 1,
    paddingBottom: HP(8),
    position: 'relative',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: colors.White,
    overflow: 'hidden',
  },
  animatedContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  nodeContainer: {
    position: 'absolute',
  },
  nodeBox: {
    height: HP(5.5),
    borderRadius: WP(1),
    backgroundColor: colors.White,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2.5,
  },
  nodeInput: {
    paddingHorizontal: WP(3),
    paddingVertical: HP(1),
    fontSize: FS(1.6),
    color: '#575656',
    textAlign: 'center',
    fontFamily: 'OpenSans-SemiBold',
  },
  hiddenInput: {
    opacity: 0,
  },
  numberOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  numberedDisplayText: {
    fontSize: FS(1.6),
    color: '#575656',
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
  },
  holdPressIconContainer: {
    position: 'absolute',
    top: HP(1.5),
    right: WP(4.5),
    zIndex: 10,
  },
  holdPressIcon: {
    width: WP(2.35),
    height: WP(2.35),
  },
  noteIndicator: {
    position: 'absolute',
    top: HP(0.5),
    right: WP(1),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: WP(1),
    paddingHorizontal: WP(0.5),
  },
  noteIndicatorText: {
    fontSize: FS(1.2),
  },
  // Completion styles
  completedNodeText: {
    color: '#2E7D4A',
    fontWeight: '600',
  },
  numberedDisplayText: {
    fontSize: FS(1.6),
    color: '#575656',
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
  },
  connectionStartPoint: {
    position: 'absolute',
    width: WP(6),
    height: WP(6),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  startPointImage: {
    width: '100%',
    height: '100%',
  },
  connectionArrow: {
    position: 'absolute',
    width: WP(8),
    height: WP(4),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  arrowImage: {
    width: '100%',
    height: '100%',
  },
  writeNoteContainer: {
    position: 'absolute',
    backgroundColor: 'transparent',
    width: WP(35),
    zIndex: 20,
  },
  noteInputContainer: {
    marginBottom: HP(2),
  },
  noteInputContent: {
    backgroundColor: colors.White,
    borderRadius: WP(1.3),
    borderWidth: 0.3,
    borderColor: colors.Primary,
    padding: WP(2),
    position: 'relative',
    width: WP(35),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: HP(-0.6),
  },
  noteAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: WP(4),
    height: WP(4),
    borderRadius: WP(2),
    backgroundColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: WP(1),
  },
  avatarText: {
    fontSize: FS(0.8),
    fontWeight: 'bold',
    color: '#666',
  },
  noteAuthor: {
    fontSize: FS(0.75),
    fontFamily: 'OpenSans-Bold',
    color: '#575656',
  },
  noteTime: {
    fontSize: FS(0.55),
    color: '#575656',
    fontFamily: 'OpenSans-SemiBold',
    marginTop: HP(0.1),
  },
  noteInput: {
    fontSize: FS(1),
    color: '#575656',
    lineHeight: FS(1.8),
    minHeight: HP(5),
    textAlignVertical: 'top',
    marginTop: HP(1),
  },
});

export default MindMapScreen;
