option explicit

!INC Local Scripts.EAConstants-VBScript
!INC EAScriptLib.VBScript-Logging
'
' Script Name:  FindClassifier
' Author: 
' Purpose: Find the classifier (or property type)for a selected object (instance), port, part or attributes
' Date: 27.07.2023

sub selectClassifier (classifierID, classifierGUID)
	dim theClassifier as EA.Element
	if classifierID = "0" OR classifierID = "" OR classifierID = "none" then
		if classifierGUID = "none" OR classifierGUID = "" then
			Session.Prompt "This instance has no classifier.", promptOK
			exit sub
		else
			set theClassifier = Repository.GetElementByGuid(classifierGUID)		
		end if		
	else 
		set theClassifier = Repository.GetElementByID(classifierID)
	end if
	Repository.ShowInProjectView(theClassifier)	
end sub

sub OnProjectBrowserScript()	
	' Get the type of element selected in the Project Browser
	dim treeSelectedType
	treeSelectedType = Repository.GetTreeSelectedItemType()
	
	select case treeSelectedType
		case otElement
'			' Code for when an element is selected
			dim theElement as EA.Element
			set theElement = Repository.GetTreeSelectedObject()						
			Repository.ClearOutput "Script"
			LOGInfo( "Starting FindClassifier script" )
			LOGInfo( "==============================" )
			LOGInfo(theElement.Type)
			if theElement.Type = "Object" then
				' an object classifier ID is set in the ClassifierID
				selectClassifier theElement.ClassifierID, "none"		
			elseif theElement.Type = "Part" or theElement.Type = "Port" then
				' a part or port classifier GUID is set in the MiscData
				selectClassifier "none", theElement.MiscData(0)
			elseif theElement.Type = "Action" or theElement.Type = "ActivityParameter" or theElement.Type = "ActionPin" or theElement.Type = "ActivityPartition" then
				selectClassifier theElement.ClassifierID, "none"
			else 
				Session.Prompt "Only Instances/Objects, Parts, Ports, or Attributes are supported.", promptOK
			end if

		case otAttribute
			dim theAttribute as EA.Attribute
			set theAttribute = Repository.GetTreeSelectedObject()
			Repository.ClearOutput "Script"
			LOGInfo( "Starting FindClassifier script" )
			LOGInfo( "==============================" )
			' an attribute classifier ID is set in the ClassifierID
			selectClassifier theAttribute.ClassifierID, "none"
			
		case else
			' Error message
			Session.Prompt "This script does not support items of this type.", promptOK
			
	end select
	
end sub

OnProjectBrowserScript
