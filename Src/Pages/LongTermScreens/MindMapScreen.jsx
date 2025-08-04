import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, {Path, Defs, Marker, Circle, G} from 'react-native-svg';
import {useNavigation, useRoute} from '@react-navigation/native';
import Headers from '../../Components/Headers';
import BottomToolbar from '../../Components/BottomToolbar';
import {colors, Icons} from '../../Helper/Contants';
import {HP, WP, FS} from '../../utils/dimentions';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const VERTICAL_GAP = HP(12);
const HORIZONTAL_GAP = WP(12);
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;
const ZOOM_SENSITIVITY = 0.002;
const PAN_THRESHOLD = 5;

const MindMapScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const goalData = route.params || {};

  // Enhanced zoom and pan states with smooth animations
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  // Animated values for smooth transformations
  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateXValue = useRef(new Animated.Value(0)).current;
  const translateYValue = useRef(new Animated.Value(0)).current;

  // Gesture tracking
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);
  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const isPanning = useRef(false);
  const isScaling = useRef(false);

  const [nodes, setNodes] = useState([
    {
      id: '1',
      text: '',
      x: WP(22),
      y: HP(12),
      parentId: null,
      color: '#F7F7F7',
      borderColor: '#535353',
      level: 0,
    },
  ]);

  const [connections, setConnections] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [nodeNumbers, setNodeNumbers] = useState(new Map());
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [isWriteNoteVisible, setIsWriteNoteVisible] = useState(false);
  const [selectedNodeForNote, setSelectedNodeForNote] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [holdPressedNodeId, setHoldPressedNodeId] = useState(null);
  const [showBottomToolbar, setShowBottomToolbar] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const nodeIdCounter = useRef(2);

  // Calculate distance between two touches
  const getDistance = touches => {
    if (touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = touches => {
    if (touches.length < 2) return {x: 0, y: 0};
    return {
      x: (touches[0].pageX + touches[1].pageX) / 2,
      y: (touches[0].pageY + touches[1].pageY) / 2,
    };
  };

  // Smooth animation helper
  const animateToValues = (
    newScale,
    newTranslateX,
    newTranslateY,
    duration = 200,
  ) => {
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: newScale,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateXValue, {
        toValue: newTranslateX,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateYValue, {
        toValue: newTranslateY,
        duration,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setScale(newScale);
      setTranslateX(newTranslateX);
      setTranslateY(newTranslateY);
      lastScale.current = newScale;
      lastTranslateX.current = newTranslateX;
      lastTranslateY.current = newTranslateY;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const {dx, dy} = gestureState;
        const touches = evt.nativeEvent.touches;

        if (touches.length > 1) {
          return true;
        }

        return Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD;
      },

      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return evt.nativeEvent.touches.length > 1;
      },

      onPanResponderGrant: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          isScaling.current = true;
          isPanning.current = false;
          initialDistance.current = getDistance(touches);
          initialScale.current = scale;
        } else if (touches.length === 1) {
          isPanning.current = true;
          isScaling.current = false;
        }

        lastScale.current = scale;
        lastTranslateX.current = translateX;
        lastTranslateY.current = translateY;
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2 && isScaling.current) {
          const currentDistance = getDistance(touches);
          const scaleMultiplier = currentDistance / initialDistance.current;
          const newScale = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, initialScale.current * scaleMultiplier),
          );

          const center = getCenter(touches);
          const screenCenterX = screenWidth / 2;
          const screenCenterY = screenHeight / 2;

          const focalX = center.x - screenCenterX;
          const focalY = center.y - screenCenterY;

          const scaleDiff = newScale - lastScale.current;
          const newTranslateX =
            lastTranslateX.current - (focalX * scaleDiff) / newScale;
          const newTranslateY =
            lastTranslateY.current - (focalY * scaleDiff) / newScale;

          scaleValue.setValue(newScale);
          translateXValue.setValue(newTranslateX);
          translateYValue.setValue(newTranslateY);

          setScale(newScale);
          setTranslateX(newTranslateX);
          setTranslateY(newTranslateY);
        } else if (touches.length === 1 && isPanning.current) {
          const newTranslateX = lastTranslateX.current + gestureState.dx;
          const newTranslateY = lastTranslateY.current + gestureState.dy;

          const maxTranslateX = screenWidth / 2;
          const maxTranslateY = screenHeight / 2;
          const minTranslateX = -screenWidth / 2;
          const minTranslateY = -screenHeight / 2;

          const boundedTranslateX = Math.max(
            minTranslateX,
            Math.min(maxTranslateX, newTranslateX),
          );
          const boundedTranslateY = Math.max(
            minTranslateY,
            Math.min(maxTranslateY, newTranslateY),
          );

          translateXValue.setValue(boundedTranslateX);
          translateYValue.setValue(boundedTranslateY);

          setTranslateX(boundedTranslateX);
          setTranslateY(boundedTranslateY);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        if (
          isPanning.current &&
          (Math.abs(gestureState.vx) > 0.5 || Math.abs(gestureState.vy) > 0.5)
        ) {
          const momentumX = gestureState.vx * 50;
          const momentumY = gestureState.vy * 50;

          const finalTranslateX = Math.max(
            -screenWidth,
            Math.min(screenWidth, translateX + momentumX),
          );
          const finalTranslateY = Math.max(
            -screenHeight,
            Math.min(screenHeight, translateY + momentumY),
          );

          animateToValues(scale, finalTranslateX, finalTranslateY, 300);
        } else {
          lastScale.current = scale;
          lastTranslateX.current = translateX;
          lastTranslateY.current = translateY;
        }

        isPanning.current = false;
        isScaling.current = false;
      },

      onPanResponderTerminate: () => {
        isPanning.current = false;
        isScaling.current = false;
      },
    }),
  ).current;

  const handleNextPress = () => {
    const mindMapData = {
      ...goalData,
      nodes,
      connections,
    };

    console.log('Mind Map data:', mindMapData);
    navigation.navigate('LandingPage', mindMapData);
  };

  const getNodeWidth = level => (level === 0 ? WP(45) : WP(38));
  const getBorderWidth = level => (level === 0 ? 0.2 : 1);

  const getNodeColors = (level, parentId) => {
    if (level === 0) return {color: '#F5F5F5', borderColor: '#FFFF00'};
    if (level === 1) return {color: '#FFFFFF', borderColor: '#F1BB41'};
    if (level === 2) return {color: '#FFFFFF', borderColor: '#902F18'};
    return {color: '#91CFBB', borderColor: '#006839'};
  };

  const getConnectionPoints = (fromNode, toNode, direction) => {
    const fromNodeWidth = getNodeWidth(fromNode.level);
    const circleSize = WP(6);
    const arrowSize = WP(8);

    let fromX, fromY, toX, toY;

    if (direction === 'right') {
      fromX = fromNode.x + fromNodeWidth + circleSize / 2;
      fromY = fromNode.y + HP(2.75);
      toX = toNode.x - arrowSize / 6;
      toY = fromNode.y + HP(2.75);
    } else {
      if (fromNode.level === 0) {
        fromX = fromNode.x + fromNodeWidth;
        fromY = fromNode.y + HP(6) + circleSize / 2;
        toX = toNode.x;
        toY = toNode.y - arrowSize / 6;
      } else {
        fromX = fromNode.x;
        fromY = fromNode.y + HP(6) + circleSize / 2;
        toX = toNode.x;
        toY = toNode.y - arrowSize / 6;
      }
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
          conn =>
            conn.from &&
            conn.to &&
            conn.from.id === parentNode.id &&
            conn.to.id === node.id,
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
              conn =>
                conn.from &&
                conn.to &&
                conn.from.id === parentNode.id &&
                conn.to.id === n.id,
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
              conn =>
                conn.from &&
                conn.to &&
                conn.from.id === parentNode.id &&
                conn.to.id === n.id,
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

  const updateNodeText = (nodeId, newText) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId ? {...node, text: newText} : node,
      ),
    );
  };

  React.useEffect(() => {}, [nodes]);

  const addChildNode = (parentId, direction) => {
    const parentNode = nodes.find(node => node.id === parentId);
    if (!parentNode) return;

    if (parentNode.level === 0 && direction === 'right') {
      return;
    }

    let baseX, baseY;
    const newLevel = parentNode.level + 1;
    const colors = getNodeColors(newLevel, parentId);
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
    };

    const newConnection = {
      id: `${parentId}-${newNodeId}`,
      from: parentNode,
      to: newNode,
      direction: direction,
    };

    setNodes(prevNodes => [...prevNodes, newNode]);
    setConnections(prevConnections => [...prevConnections, newConnection]);
  };

  const deleteNode = nodeId => {
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
          !nodeIdsToDelete.includes(conn.from.id) &&
          !nodeIdsToDelete.includes(conn.to.id),
      ),
    );

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
      setIsWriteNoteVisible(true);
      setHoldPressedNodeId(node.id);
    }
  };

  const handlePressIn = node => {
    if (node.text.trim().length > 0) {
      setHoldPressedNodeId(node.id);
    }
  };

  const handlePressOut = () => {
    if (!isWriteNoteVisible) {
      setHoldPressedNodeId(null);
    }
  };

  const hideWriteNote = () => {
    setIsWriteNoteVisible(false);
    setSelectedNodeForNote(null);
    setNewNoteText('');
    setHoldPressedNodeId(null);
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

  // Bottom toolbar handlers
  const handleAddPress = () => {
    console.log('Add pressed');
  };

  const handleDeletePress = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
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
              borderColor: isSelected ? '#0059FF' : node.borderColor,
              width: nodeWidth,
              borderWidth: isSelected ? 2 : borderWidth,
            },
          ]}
          onPress={() => handleNodePress(node)}
          onLongPress={() => handleNodeLongPress(node)}
          onPressIn={() => handlePressIn(node)}
          onPressOut={handlePressOut}
          activeOpacity={1}
          delayLongPress={500}>
          <TextInput
            style={[styles.nodeInput, shouldShowNumber && styles.hiddenInput]}
            placeholder={
              node.level === 0 ? 'Enter your goal...' : 'Enter text...'
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
              <Text style={styles.numberedDisplayText}>{displayText}</Text>
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
        </TouchableOpacity>
      </View>
    );
  };

  const renderConnections = () => {
    return connections.map(connection => {
      const {fromX, fromY, toX, toY} = getConnectionPoints(
        connection.from,
        connection.to,
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
    });
  };

  const renderConnectionImages = () => {
    const imageElements = [];

    connections.forEach(connection => {
      const fromNode = connection.from;
      const toNode = connection.to;
      const fromNodeWidth = getNodeWidth(fromNode.level);

      let circleX, circleY;
      if (connection.direction === 'right') {
        circleX = fromNode.x + fromNodeWidth;
        circleY = fromNode.y + HP(2.75);
      } else {
        if (fromNode.level === 0) {
          circleX = fromNode.x + fromNodeWidth;
          circleY = fromNode.y + HP(6);
        } else {
          circleX = fromNode.x;
          circleY = fromNode.y + HP(6);
        }
      }

      let arrowX, arrowY;
      if (connection.direction === 'right') {
        arrowX = toNode.x - WP(5.5);
        arrowY = toNode.y + HP(1.75);
      } else {
        arrowX = toNode.x + WP(-3.8);
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
    const noteY = selectedNodeForNote.y - HP(10.6);

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
                  <Text style={styles.avatarText}>H</Text>
                </View>
                <View>
                  <Text style={styles.noteAuthor}>Harshit Gurjar</Text>
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
              onChangeText={setNewNoteText}
              multiline={true}
            />
          </View>
        </View>
      </View>
    );
  };

  const maxX =
    nodes.length > 0
      ? Math.max(...nodes.map(node => node.x + getNodeWidth(node.level)))
      : WP(100);
  const maxY =
    nodes.length > 0 ? Math.max(...nodes.map(node => node.y + HP(6))) : HP(100);
  const canvasWidth = Math.max(maxX + WP(50), screenWidth * 2);
  const canvasHeight = Math.max(maxY + HP(25), screenHeight * 2);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />
      <View style={styles.headerWrapper}>
        <Headers title="Set Long Term Goal">
          <TouchableOpacity onPress={handleNextPress}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.canvasContainer}>
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.animatedContainer,
              {
                transform: [
                  {scaleX: scaleValue},
                  {scaleY: scaleValue},
                  {translateX: translateXValue},
                  {translateY: translateYValue},
                ],
              },
            ]}>
            <TouchableOpacity
              style={{
                width: canvasWidth,
                height: canvasHeight,
                position: 'relative',
              }}
              activeOpacity={1}
              onPress={handleOutsidePress}>
              <Svg
                height={canvasHeight}
                width={canvasWidth}
                style={StyleSheet.absoluteFillObject}>
                {renderConnections()}
              </Svg>

              {nodes.map(renderNode)}
              {renderConnectionImages()}
              {renderWriteNoteSection()}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {showBottomToolbar && isUserTyping && (
        <BottomToolbar
          onAddPress={handleAddPress}
          onDeletePress={handleDeletePress}
          onMorePress={handleMorePress}
          onLeftActionPress={handleLeftActionPress}
          onRightActionPress={handleRightActionPress}
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
    elevation: 2,
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
  },
});

export default MindMapScreen;
