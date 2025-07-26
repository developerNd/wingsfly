import React, {useState} from 'react';
import {
  Text,
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {HP, WP, FS} from '../../../../utils/dimentions';
import Headers from '../../../../Components/Headers';
import {colors} from '../../../../Helper/Contants';

const LinkGoal = ({initialSelectedGoal = null, onGoalSelect = null}) => {
  const [selectedGoal, setSelectedGoal] = useState(initialSelectedGoal);

  const goalsData = {
    longTermGoals: [
      {id: '1', title: 'Weight Loss Journey'},
      {id: '2', title: 'Crack UPSC Exam'},
    ],
    recurringGoals: [
      {id: '3', title: 'Read 10 Page Daily'},
      {id: '4', title: 'Solve Question Paper Daily'},
    ],
  };

  const handleGoalSelect = goal => {
    setSelectedGoal(goal);
    if (onGoalSelect) {
      onGoalSelect(goal);
    }
  };

  const handleDone = () => {
    console.log('Done pressed with selected goal:', selectedGoal);
  };

  const handleBack = () => {
    console.log('Back pressed');
  };

  const renderGoalItem = (goal, isSelected, goalType) => {
    const isLongTerm = goalType === 'longTerm';

    return (
      <TouchableOpacity
        key={goal.id}
        style={[
          isLongTerm ? styles.goalItem : styles.goalItemRecurring,
          isSelected &&
            (isLongTerm
              ? styles.goalItemSelected
              : styles.goalItemRecurringSelected),
        ]}
        onPress={() => handleGoalSelect(goal)}
        activeOpacity={0.7}>
        <Text
          style={[
            isLongTerm ? styles.goalText : styles.goalTextRecurring,
            isSelected &&
              (isLongTerm
                ? styles.goalTextSelected
                : styles.goalTextRecurringSelected),
          ]}>
          {goal.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGoalSection = (title, goals, goalType) => {
    const isLongTerm = goalType === 'longTerm';

    return (
      <View
        style={
          isLongTerm
            ? styles.sectionContainer
            : styles.sectionContainerRecurring
        }>
        <Text
          style={
            isLongTerm ? styles.sectionTitle : styles.sectionTitleRecurring
          }>
          {title}
        </Text>
        {goals.map(goal =>
          renderGoalItem(goal, selectedGoal?.id === goal.id, goalType),
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.White} barStyle="dark-content" />

      <View style={styles.headerWrapper}>
        <Headers title="Link a Goal">
          <TouchableOpacity onPress={handleDone}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </Headers>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}>
        {renderGoalSection(
          'Long Term Goal',
          goalsData.longTermGoals,
          'longTerm',
        )}

        {renderGoalSection(
          'Recurring Goal',
          goalsData.recurringGoals,
          'recurring',
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.White,
  },
  headerWrapper: {
    marginTop: HP(2),
    paddingBottom: HP(0.25),
  },
  doneText: {
    fontSize: FS(1.7),
    color: '#1A73E8',
    fontFamily: 'OpenSans-Bold',
    marginTop: HP(0.5),
  },
  content: {
    flex: 1,
    paddingHorizontal: WP(4),
    paddingTop: HP(2.2),
  },
  contentContainer: {
    paddingBottom: HP(2),
  },
  sectionContainer: {
    marginBottom: HP(1),
  },
  sectionTitle: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    marginBottom: HP(1),
    marginLeft: WP(1),
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.White,
    borderRadius: WP(2),
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.7),
    marginBottom: HP(1.8),
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.2),
    },
    shadowOpacity: 0.05,
    shadowRadius: WP(1.5),
    elevation: WP(1),
  },
  goalItemSelected: {
    backgroundColor: colors.White,
  },
  goalText: {
    fontSize: FS(1.65),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    flex: 1,
    marginLeft: WP(-1),
  },
  goalTextSelected: {
    fontFamily: 'OpenSans-SemiBold',
  },
  sectionContainerRecurring: {
    marginBottom: HP(1),
  },
  sectionTitleRecurring: {
    fontSize: FS(1.9),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    marginBottom: HP(2),
    marginLeft: WP(0.6),
  },
  goalItemRecurring: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.White,
    borderRadius: WP(2),
    paddingHorizontal: WP(4),
    paddingVertical: HP(1.7),
    marginBottom: HP(1.8),
    shadowColor: colors.Shadow,
    shadowOffset: {
      width: 0,
      height: HP(0.2),
    },
    shadowOpacity: 0.05,
    shadowRadius: WP(1.5),
    elevation: WP(1),
  },
  goalItemRecurringSelected: {
    backgroundColor: colors.White,
  },
  goalTextRecurring: {
    fontSize: FS(1.8),
    fontFamily: 'OpenSans-SemiBold',
    color: '#575656',
    flex: 1,
    marginLeft: WP(0.5),
  },
  goalTextRecurringSelected: {
    fontFamily: 'OpenSans-SemiBold',
  },
});

export default LinkGoal;
